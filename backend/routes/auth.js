import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail } from "../data/users.js";
import { JWT_SECRET } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, name: "auth" });
router.use(authLimiter);

// POST /api/auth/register
router.post("/register", async (req, res) => {
  if (process.env.ALLOW_REGISTRATION === "false") {
    return res.status(403).json({ error: "Registration is disabled on this server." });
  }
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email) || email.length > 200) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 100) {
    return res.status(400).json({ error: "Password must be 6-100 characters" });
  }

  const user = await createUser({ email, password, name });
  if (!user) return res.status(409).json({ error: "Email already registered" });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password are required" });
  }
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

export default router;