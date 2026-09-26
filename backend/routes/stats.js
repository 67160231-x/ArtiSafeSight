import { Router } from "express";
import { getStats } from "../data/mockData.js";

const router = Router();

// GET /api/stats — dashboard summary numbers (active cameras, warnings, compliance)
router.get("/", (req, res) => {
  res.json(getStats());
});

export default router;
