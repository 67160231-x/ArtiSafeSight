import { Router } from "express";
import { listAlerts, acknowledgeAlert } from "../data/mockData.js";

const router = Router();

// GET /api/alerts?severity=critical|high|medium|all
router.get("/", (req, res) => {
  const severity = req.query.severity || "all";
  res.json(listAlerts(severity));
});

// PATCH /api/alerts/:id/acknowledge — mark an alert as reviewed
router.patch("/:id/acknowledge", (req, res) => {
  const alert = acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  res.json(alert);
});

export default router;
