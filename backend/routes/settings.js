import { Router } from "express";
import { getSettings, updateSettings } from "../data/mockData.js";

const router = Router();

// GET /api/settings — current detection toggle state
router.get("/", (req, res) => {
  res.json(getSettings());
});

// PUT /api/settings — persist a settings change from the Settings page
router.put("/", (req, res) => {
  const patch = req.body || {};
  const allowed = ["hardhat", "vest", "proximity", "email", "faceBlur"];
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([k]) => allowed.includes(k))
  );
  res.json(updateSettings(clean));
});

export default router;
