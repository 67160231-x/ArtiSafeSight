import { Router } from "express";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { addDetection } from "../data/mockData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ML_DIR = path.join(__dirname, "..", "..", "ml");
const WEIGHTS_PATH = path.join(ML_DIR, "model", "best.pt");
const SCRIPT_PATH = path.join(ML_DIR, "detect_image.py");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = Router();

function runInference(imagePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [
      SCRIPT_PATH,
      "--weights", WEIGHTS_PATH,
      "--source", imagePath
    ]);

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `Inference exited with code ${code}`));
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Could not parse inference output: ${stdout}`));
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

// POST /api/detect — upload a photo, run the trained YOLOv8 PPE model on it.
// Falls back to a clear "model not trained yet" response until
// ml/model/best.pt exists (see ml/README.md).
router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded (field name: 'image')" });
  }

  if (!fs.existsSync(WEIGHTS_PATH)) {
    return res.status(503).json({
      error: "No trained model found yet.",
      detail:
        "Train one with ml/train_model.py on a GPU machine, then copy the " +
        "weights to ml/model/best.pt — see ml/README.md.",
      modelReady: false
    });
  }

  const tmpPath = path.join(os.tmpdir(), `upload-${Date.now()}${path.extname(req.file.originalname) || ".jpg"}`);
  fs.writeFileSync(tmpPath, req.file.buffer);

  try {
    const result = await runInference(tmpPath);

    // Optionally log violations onto a camera's feed if cameraId was passed
    if (req.body.cameraId && Array.isArray(result.violations)) {
      for (const v of result.violations) {
        addDetection(req.body.cameraId, v);
      }
    }

    res.json({ modelReady: true, ...result });
  } catch (err) {
    res.status(500).json({ error: "Inference failed", detail: err.message });
  } finally {
    fs.unlink(tmpPath, () => {});
  }
});

export default router;
