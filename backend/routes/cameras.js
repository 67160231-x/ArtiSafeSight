import { Router } from "express";
import { listCameras, getCamera, addDetection } from "../data/store.js";
import { scanAllCameras } from "../services/cameraScanner.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

// GET /api/cameras — all feeds with the latest model-derived detections
router.get("/", (req, res) => {
  res.json(listCameras());
});

// POST /api/cameras/scan — re-run the PPE model on every camera frame
router.post("/scan", rateLimit({ windowMs: 60_000, max: 6, name: "scan" }), async (req, res) => {
  const result = await scanAllCameras();
  res.json({ ...result, cameras: listCameras() });
});

// GET /api/cameras/:id — single camera detail
router.get("/:id", (req, res) => {
  const camera = getCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: "Camera not found" });
  res.json(camera);
});

// POST /api/cameras/:id/detections — push an external detection (e.g. from an edge device)
router.post("/:id/detections", (req, res) => {
  const { label, severity, box } = req.body || {};
  if (!label || !severity) {
    return res.status(400).json({ error: "label and severity are required" });
  }
  const detection = addDetection(req.params.id, { label, severity, box });
  if (!detection) return res.status(404).json({ error: "Camera not found" });
  res.status(201).json(detection);
});

export default router;
