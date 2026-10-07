import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { detect, status as detectorStatus } from "./detector.js";
import { cameraDefs, applyScan, getSettings } from "../data/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, "..", "assets", "cameras");

let scanning = null; // in-flight promise, so concurrent callers share one scan

async function scanOne(def) {
  const file = path.join(ASSETS, path.basename(def.image));
  const buf = await fs.readFile(file);
  const meta = await sharp(buf).metadata();
  const s = getSettings();
  const result = await detect(buf, { hardhat: s.hardhat, vest: s.vest });
  applyScan(def.id, {
    violations: result.violations,
    summary: result.summary,
    faces: result.faces,
    imageWidth: meta.width,
    imageHeight: meta.height
  });
  return result.violations.length;
}

/** Run the model over every camera frame (sequentially: memory-friendly). */
export function scanAllCameras() {
  if (!detectorStatus().ready) return Promise.resolve({ scanned: 0, skipped: "model-not-ready" });
  if (scanning) return scanning;

  scanning = (async () => {
    const t0 = Date.now();
    let scanned = 0;
    let violations = 0;
    for (const def of cameraDefs) {
      try {
        violations += await scanOne(def);
        scanned++;
      } catch (err) {
        console.error(`[scanner] ${def.id} failed:`, err.message);
      }
    }
    console.log(`[scanner] ${scanned}/${cameraDefs.length} cameras scanned, ${violations} violations, ${Date.now() - t0} ms`);
    return { scanned, violations, ms: Date.now() - t0 };
  })().finally(() => {
    scanning = null;
  });

  return scanning;
}
