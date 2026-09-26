import "dotenv/config";
import express from "express";
import cors from "cors";
import camerasRouter from "./routes/cameras.js";
import alertsRouter from "./routes/alerts.js";
import statsRouter from "./routes/stats.js";
import authRouter from "./routes/auth.js";
import settingsRouter from "./routes/settings.js";
import detectRouter from "./routes/detect.js";
import { requireAuth } from "./middleware/auth.js";
import "./inferenceProcess.js"; // starts the persistent Python model server

const app = express();
const PORT = process.env.PORT || 4000;

// In production, set CORS_ORIGIN to your Vercel frontend URL
// (e.g. https://artisafesight.vercel.app). Falls back to allow-all for local dev.
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Simple request log — swap for a real logger (pino/morgan) in production
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "artisafesight-backend", time: new Date().toISOString() });
});

// Auth routes are public (you need them to log in in the first place)
app.use("/api/auth", authRouter);

// Everything below requires a valid Bearer token
app.use("/api/cameras", requireAuth, camerasRouter);
app.use("/api/alerts", requireAuth, alertsRouter);
app.use("/api/stats", requireAuth, statsRouter);
app.use("/api/settings", requireAuth, settingsRouter);
app.use("/api/detect", requireAuth, detectRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`ArtiSafeSight backend running on http://localhost:${PORT}`);
});