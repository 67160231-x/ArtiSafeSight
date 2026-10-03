// Spawns ml/inference_server.py ONCE when this module is first imported and
// keeps it running for the lifetime of the Node process, instead of
// detect.js spawning a brand-new "python3 detect_image.py" process (which
// re-imports torch + reloads the model weights from disk) on every single
// /api/detect request. That old approach was slow (15-30s per request) and,
// under Render's limited RAM, could OOM-crash the whole container when a
// detect request landed while other requests were in flight.
//
// This module owns the child process's lifecycle: start it, log its output,
// restart it if it ever dies unexpectedly, and expose a readiness check that
// detect.js awaits before forwarding a request (covers the cold-start window
// right after a deploy, while torch/ultralytics are still loading).

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ML_DIR = path.join(__dirname, "..", "ml");
const SERVER_SCRIPT = path.join(ML_DIR, "inference_server.py");

export const INFERENCE_PORT = process.env.INFERENCE_PORT || 5001;
export const INFERENCE_URL = `http://127.0.0.1:${INFERENCE_PORT}`;

let proc = null;
let ready = false;

function startProcess() {
  ready = false;
  console.log("[inferenceProcess] Starting persistent Python inference server...");
  proc = spawn("python3", [SERVER_SCRIPT], {
    env: { ...process.env, INFERENCE_PORT: String(INFERENCE_PORT) }
  });

  proc.stdout.on("data", (d) => process.stdout.write(`[inference] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[inference] ${d}`));

  // Without this handler, a spawn failure (e.g. python3 not found) would
  // throw an uncaught error and crash the whole Node process — never let
  // that happen. Log it and let the "exit" handler below retry instead.
  proc.on("error", (err) => {
    console.error("[inferenceProcess] Failed to start Python process:", err.message);
  });

  proc.on("exit", (code) => {
    console.error(`[inferenceProcess] Python server exited (code ${code}) — restarting in 3s`);
    ready = false;
    setTimeout(startProcess, 3000);
  });
}

startProcess();

// Poll /health until the models are loaded (or timeoutMs elapses).
// Cheap to call repeatedly — resolves immediately once ready is true.
export async function waitUntilReady(timeoutMs = 90000) {
  if (ready) return true;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${INFERENCE_URL}/health`);
      if (res.ok) {
        ready = true;
        return true;
      }
    } catch {
      // server not up yet — keep polling
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}
