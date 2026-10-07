// Native Node inference for ArtiSafeSight — no Python, no PyTorch.
//
// Two YOLOv8-nano ONNX models run back-to-back on ONE shared 640x640 tensor:
//   1. ppe_hat_vest_nano.onnx  — the friend-trained PPE model  (Hard_hat, Vest)
//   2. person_yolov8n.onnx     — stock COCO YOLOv8n, class 0 only (Person)
// A person with no Hard_hat / Vest on their body => compliance violation.
//
// Memory design (Render 512 MB):
//   * onnxruntime-node (CPU only), 1 thread, memory arena + mem-pattern OFF
//   * one preallocated 640x640x3 Float32 tensor reused for every request
//   * sharp cache disabled, 1 libvips thread, hard cap on input pixels
//   * a strict FIFO queue — only ONE inference ever runs at a time
//   * both sessions are loaded + warmed at boot so a memory problem shows up
//     at deploy time instead of in the middle of a user request

import * as ort from "onnxruntime-node";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = process.env.MODELS_DIR || path.join(__dirname, "..", "models");

const SIZE = 640;
const PPE_CLASSES = ["Hard_hat", "Vest"]; // must match data.yaml of the trained model
const PAD = 114 / 255;

export const CONFIG = {
  ppeConf: Number(process.env.PPE_CONF || 0.5),
  personConf: Number(process.env.PERSON_CONF || 0.4),
  iou: Number(process.env.NMS_IOU || 0.6),
  maxQueue: Number(process.env.MAX_INFERENCE_QUEUE || 4),
  maxPixels: Number(process.env.MAX_INPUT_PIXELS || 40_000_000)
};

sharp.cache(false);
sharp.concurrency(1);

let ppeSession = null;
let personSession = null;
let inputName = { ppe: null, person: null };
let ready = false;
let loadError = null;

// Single reusable input buffer: [1,3,640,640] float32 = 4.9 MB
const tensorData = new Float32Array(3 * SIZE * SIZE);

const SESSION_OPTS = {
  executionProviders: ["cpu"],
  graphOptimizationLevel: "all",
  intraOpNumThreads: 1,
  interOpNumThreads: 1,
  executionMode: "sequential",
  enableCpuMemArena: false,
  enableMemPattern: false,
  logSeverityLevel: 3
};

// ---------- queue (strict concurrency = 1, bounded backlog) ----------
let tail = Promise.resolve();
let pending = 0;

export class BusyError extends Error {
  constructor() {
    super("Detector is busy, please retry in a moment");
    this.code = "BUSY";
  }
}

function enqueue(task) {
  if (pending >= CONFIG.maxQueue) return Promise.reject(new BusyError());
  pending++;
  const run = tail.then(task, task);
  tail = run.catch(() => {}).finally(() => {
    pending--;
  });
  return run;
}

// ---------- preprocessing ----------
// Letterbox into the shared tensor. Returns the geometry needed to map boxes
// back to % of the ORIGINAL image (percentages don't depend on the scale).
async function preprocess(buffer) {
  const { data, info } = await sharp(buffer, { limitInputPixels: CONFIG.maxPixels, failOn: "error" })
    .rotate() // honour EXIF orientation (phone photos)
    .resize(SIZE, SIZE, { fit: "inside" })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const nw = info.width;
  const nh = info.height;
  const padX = Math.floor((SIZE - nw) / 2);
  const padY = Math.floor((SIZE - nh) / 2);

  tensorData.fill(PAD);
  const plane = SIZE * SIZE;
  for (let y = 0; y < nh; y++) {
    const rowOut = (y + padY) * SIZE + padX;
    const rowIn = y * nw * 3;
    for (let x = 0; x < nw; x++) {
      const i = rowIn + x * 3;
      const o = rowOut + x;
      tensorData[o] = data[i] / 255;
      tensorData[plane + o] = data[i + 1] / 255;
      tensorData[2 * plane + o] = data[i + 2] / 255;
    }
  }
  return { nw, nh, padX, padY };
}

// ---------- postprocessing ----------
function iouOf(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
  return union <= 0 ? 0 : inter / union;
}

// YOLOv8 head output: [1, 4+nc, 8400] (channel-major): cx,cy,w,h then class scores.
function decode(output, numClasses, classFilter, conf, geo) {
  const data = output.data;
  const n = output.dims[2];
  const candidates = [];

  for (let i = 0; i < n; i++) {
    let best = -1;
    let bestScore = conf;
    for (const c of classFilter) {
      const s = data[(4 + c) * n + i];
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (best < 0) continue;
    const cx = data[i];
    const cy = data[n + i];
    const w = data[2 * n + i];
    const h = data[3 * n + i];
    candidates.push({
      cls: best,
      score: bestScore,
      x1: cx - w / 2,
      y1: cy - h / 2,
      x2: cx + w / 2,
      y2: cy + h / 2
    });
  }

  // per-class greedy NMS
  candidates.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const c of candidates) {
    let drop = false;
    for (const k of kept) {
      if (k.cls === c.cls && iouOf(k, c) > CONFIG.iou) {
        drop = true;
        break;
      }
    }
    if (!drop) kept.push(c);
    if (kept.length >= 100) break;
  }

  // map from 640-letterbox space to % of the original image
  const clampPct = (v) => Math.max(0, Math.min(100, v));
  return kept.map((k) => {
    const x1 = clampPct(((k.x1 - geo.padX) / geo.nw) * 100);
    const y1 = clampPct(((k.y1 - geo.padY) / geo.nh) * 100);
    const x2 = clampPct(((k.x2 - geo.padX) / geo.nw) * 100);
    const y2 = clampPct(((k.y2 - geo.padY) / geo.nh) * 100);
    return {
      cls: k.cls,
      confidence: Math.round(k.score * 1000) / 1000,
      box: {
        x: Math.round(x1 * 10) / 10,
        y: Math.round(y1 * 10) / 10,
        w: Math.round((x2 - x1) * 10) / 10,
        h: Math.round((y2 - y1) * 10) / 10
      }
    };
  });
}

// ---------- compliance rules ----------
const center = (b) => ({ cx: b.x + b.w / 2, cy: b.y + b.h / 2 });

function wearsHat(person, hats) {
  const p = person.box;
  return hats.some((h) => {
    const { cx, cy } = center(h.box);
    // hard hat centre must be inside the person horizontally and in the head zone
    return cx >= p.x && cx <= p.x + p.w && cy >= p.y - 0.12 * p.h && cy <= p.y + 0.45 * p.h;
  });
}

function wearsVest(person, vests) {
  const p = person.box;
  return vests.some((v) => {
    const { cx, cy } = center(v.box);
    // vest centre must be inside the person's torso area
    return cx >= p.x && cx <= p.x + p.w && cy >= p.y + 0.1 * p.h && cy <= p.y + 0.85 * p.h;
  });
}

function evaluate(detections, checks) {
  const people = detections.filter((d) => d.label === "Person");
  const hats = detections.filter((d) => d.label === "Hard_hat");
  const vests = detections.filter((d) => d.label === "Vest");

  const violations = [];
  for (const person of people) {
    // ignore tiny background people — too small for PPE to be judged reliably
    if (person.box.h < 8 || person.box.w < 2) continue;
    if (checks.hardhat && !wearsHat(person, hats)) {
      violations.push({ label: "No Hard Hat Detected", severity: "critical", box: person.box });
    }
    if (checks.vest && !wearsVest(person, vests)) {
      violations.push({ label: "No Safety Vest Detected", severity: "medium", box: person.box });
    }
  }
  return { people: people.length, hats: hats.length, vests: vests.length, violations };
}

// Head/face regions (used by the "blur worker faces" privacy setting). Same idea as the
// friend's detect_blur.py: the top ~22% of every person box, trimmed a little at the sides.
function headRegions(detections) {
  return detections
    .filter((d) => d.label === "Person" && d.box.h >= 8)
    .map((p) => ({
      x: Math.round((p.box.x + p.box.w * 0.12) * 10) / 10,
      y: Math.round(p.box.y * 10) / 10,
      w: Math.round(p.box.w * 0.76 * 10) / 10,
      h: Math.round(p.box.h * 0.22 * 10) / 10
    }));
}

// ---------- public API ----------
export async function loadModels() {
  try {
    const t0 = Date.now();
    ppeSession = await ort.InferenceSession.create(path.join(MODELS_DIR, "ppe_hat_vest_nano.onnx"), SESSION_OPTS);
    personSession = await ort.InferenceSession.create(path.join(MODELS_DIR, "person_yolov8n.onnx"), SESSION_OPTS);
    inputName = { ppe: ppeSession.inputNames[0], person: personSession.inputNames[0] };

    // warm-up: allocate everything now, with a blank gray frame
    tensorData.fill(PAD);
    const t = new ort.Tensor("float32", tensorData, [1, 3, SIZE, SIZE]);
    await ppeSession.run({ [inputName.ppe]: t });
    await personSession.run({ [inputName.person]: t });

    ready = true;
    console.log(`[detector] models loaded + warmed in ${Date.now() - t0} ms`);
  } catch (err) {
    loadError = err;
    ready = false;
    console.error("[detector] failed to load models:", err);
  }
}

export function status() {
  return {
    ready,
    error: loadError ? String(loadError.message || loadError) : null,
    models: { ppe: "ppe_hat_vest_nano.onnx", person: "person_yolov8n.onnx" },
    classes: ["Person", ...PPE_CLASSES],
    config: { ppeConf: CONFIG.ppeConf, personConf: CONFIG.personConf, iou: CONFIG.iou }
  };
}

/**
 * Run PPE detection on an encoded image (jpeg/png/webp/...).
 * @param {Buffer} buffer
 * @param {{hardhat?: boolean, vest?: boolean}} checks which rules to enforce
 */
export function detect(buffer, checks = {}) {
  if (!ready) {
    const e = new Error("Model not loaded");
    e.code = "NOT_READY";
    return Promise.reject(e);
  }
  const rules = { hardhat: checks.hardhat !== false, vest: checks.vest !== false };

  return enqueue(async () => {
    const t0 = Date.now();
    const geo = await preprocess(buffer);
    const tensor = new ort.Tensor("float32", tensorData, [1, 3, SIZE, SIZE]);

    const tInf = Date.now();
    const ppeOut = (await ppeSession.run({ [inputName.ppe]: tensor }))[ppeSession.outputNames[0]];
    const ppeDets = decode(ppeOut, PPE_CLASSES.length, [0, 1], CONFIG.ppeConf, geo).map((d) => ({
      label: PPE_CLASSES[d.cls],
      confidence: d.confidence,
      box: d.box
    }));
    ppeOut.dispose?.();

    const personOut = (await personSession.run({ [inputName.person]: tensor }))[personSession.outputNames[0]];
    const personDets = decode(personOut, 80, [0], CONFIG.personConf, geo).map((d) => ({
      label: "Person",
      confidence: d.confidence,
      box: d.box
    }));
    personOut.dispose?.();

    const raw = [...personDets, ...ppeDets];
    const summary = evaluate(raw, rules);

    return {
      raw_detections: raw,
      violations: summary.violations,
      faces: headRegions(raw),
      summary: { people: summary.people, hard_hats: summary.hats, vests: summary.vests },
      meta: {
        inference_ms: Date.now() - tInf,
        total_ms: Date.now() - t0,
        rules
      }
    };
  });
}
