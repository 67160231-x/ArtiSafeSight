import { Router } from "express";
import { listCameras, getCamera, addDetection, getCameraSource, clearCameraSource } from "../data/store.js";
import { scanAllCameras, scanCamera } from "../services/cameraScanner.js";
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

// GET /api/cameras/:id/source — the user-uploaded frame shown on this camera (JPEG)
router.get("/:id/source", (req, res) => {
  const src = getCameraSource(req.params.id);
  if (!src) return res.status(404).json({ error: "No custom media on this camera" });
  res.set({ "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" });
  res.send(src.jpeg);
});

// DELETE /api/cameras/:id/source — go back to the default feed and re-analyse it
router.delete("/:id/source", async (req, res) => {
  if (!clearCameraSource(req.params.id)) return res.status(404).json({ error: "Camera not found" });
  await scanCamera(req.params.id).catch((e) => console.error("[cameras] rescan failed:", e.message));
  res.json(getCamera(req.params.id));
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
