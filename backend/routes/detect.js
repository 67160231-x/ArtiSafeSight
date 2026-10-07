import { Router } from "express";
import multer from "multer";
import { detect, status, BusyError } from "../services/detector.js";
import { addDetection, getCamera, getSettings } from "../data/store.js";
import { rateLimit } from "../middleware/rateLimit.js";

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 8);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|bmp|gif|tiff)$/i.test(file.mimetype)) {
      return cb(Object.assign(new Error("Only JPEG, PNG, WebP, BMP, GIF or TIFF images are accepted."), { status: 415 }));
    }
    cb(null, true);
  }
});

const router = Router();

function singleUpload(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: `Image too large (max ${MAX_UPLOAD_MB} MB).` });
    }
    return res.status(err.status || 400).json({ error: err.message });
  });
}

// POST /api/detect  (multipart: image, optional cameraId)
// Runs the PPE model (Hard_hat, Vest) + person detector and returns
// { raw_detections, violations, summary, meta }.
router.post("/", rateLimit({ windowMs: 60_000, max: Number(process.env.DETECT_RATE_PER_MIN || 180), name: "detect" }), singleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded (field name: 'image')" });
  }

  const cameraId = req.body?.cameraId;
  if (cameraId && !getCamera(cameraId)) {
    return res.status(404).json({ error: "Camera not found" });
  }

  const s = getSettings();
  try {
    const result = await detect(req.file.buffer, { hardhat: s.hardhat, vest: s.vest });

    if (cameraId) {
      for (const v of result.violations) addDetection(cameraId, v);
    }
    res.json({ modelReady: true, ...result });
  } catch (err) {
    if (err instanceof BusyError) {
      res.set("Retry-After", "3");
      return res.status(429).json({ error: err.message });
    }
    if (err.code === "NOT_READY") {
      return res.status(503).json({
        modelReady: false,
        error: "Model is not loaded.",
        detail: status().error || "The detector is still starting up — try again in a few seconds."
      });
    }
    // sharp: unsupported / corrupt image, or too many pixels
    if (/Input|pixel|unsupported|corrupt|VipsJpeg|bad seek|decode/i.test(err.message)) {
      return res.status(400).json({ error: "Could not read that image. Try a different JPEG or PNG." });
    }
    console.error("[detect] inference failed:", err);
    res.status(500).json({ error: "Inference failed" });
  }
});

export default router;
