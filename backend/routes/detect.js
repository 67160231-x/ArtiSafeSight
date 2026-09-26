import { Router } from "express";
import multer from "multer";
import { addDetection } from "../data/mockData.js";
import { INFERENCE_URL, waitUntilReady } from "../inferenceProcess.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = Router();

// POST /api/detect — upload a photo, run it through the persistent Python
// inference server (ml/inference_server.py), which keeps the trained YOLOv8
// PPE + face models loaded in memory instead of reloading them per request.
router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded (field name: 'image')" });
  }

  // Cold start right after a deploy: torch/ultralytics can take up to ~60s
  // to import and load the weight files. Wait for that instead of failing.
  const isReady = await waitUntilReady();
  if (!isReady) {
    return res.status(503).json({
      error: "Model server did not start in time.",
      detail: "The inference server may still be loading, or ml/model/best.pt is missing.",
      modelReady: false
    });
  }

  try {
    const blob = new Blob([req.file.buffer]);
    const form = new FormData();
    form.append("image", blob, req.file.originalname || "upload.jpg");
    // Forward the caller's face-blur preference so the inference server only
    // lazy-loads face.pt when someone actually asked for it this request.
    form.append("faceBlur", req.body.faceBlur === "true" ? "true" : "false");

    const upstream = await fetch(`${INFERENCE_URL}/detect`, { method: "POST", body: form });
    const result = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(result);
    }

    // Optionally log violations onto a camera's feed if cameraId was passed
    if (req.body.cameraId && Array.isArray(result.violations)) {
      for (const v of result.violations) {
        addDetection(req.body.cameraId, v);
      }
    }

    res.json({ modelReady: true, ...result });
  } catch (err) {
    console.error("[detect] Failed to reach inference server:", err);
    res.status(502).json({ error: "Could not reach inference server", detail: err.message });
  }
});

export default router;
