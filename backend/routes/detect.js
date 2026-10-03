import { Router } from "express";
import multer from "multer";
import { addDetection } from "../data/mockData.js";

// ❌ ลบ import inferenceProcess.js ออก เพื่อไม่ให้มันแอบรัน Python ฝังตัว
// import { INFERENCE_URL, waitUntilReady } from "../inferenceProcess.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = Router();

// ✅ กำหนดตัวแปรสำหรับรับลิงก์ AI Server ภายนอก (เดี๋ยวเราจะไปใส่ลิงก์จริงในตั้งค่าของ Render ทีหลัง)
const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://127.0.0.1:5000";

router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded (field name: 'image')" });
  }

  try {
    const blob = new Blob([req.file.buffer]);
    const form = new FormData();
    form.append("image", blob, req.file.originalname || "upload.jpg");
    form.append("faceBlur", req.body.faceBlur === "true" ? "true" : "false");

    // ✅ เปลี่ยนจาก INFERENCE_URL มาใช้ AI_SERVER_URL ที่ยิงไปหาเซิร์ฟเวอร์แยกแทน
    const upstream = await fetch(`${AI_SERVER_URL}/detect`, { method: "POST", body: form });
    
    // ดักจับกรณีที่เซิร์ฟเวอร์ AI ภายนอกส่งกลับมาไม่ใช่ JSON
    if (!upstream.ok) {
        const errText = await upstream.text();
        return res.status(upstream.status).json({ error: "Upstream Error", detail: errText });
    }

    const result = await upstream.json();

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
