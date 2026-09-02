import { Router } from "express";
import { listCameras, getCamera, addDetection } from "../data/mockData.js";

const router = Router();

// GET /api/cameras — list all camera feeds with their latest detections
router.get("/", (req, res) => {
  res.json(listCameras());
});

// GET /api/cameras/:id — single camera detail
router.get("/:id", (req, res) => {
  const camera = getCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: "Camera not found" });
  res.json(camera);
});

// POST /api/cameras/:id/detections — simulate the AI model pushing a new detection
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
