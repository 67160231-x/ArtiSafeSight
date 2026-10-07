import bcrypt from "bcryptjs";

// In-memory user store — swap for a real DB (SQLite/Postgres) later.
// The function signatures below are what the rest of the app depends on,
// so you can change the internals without touching auth.js.
const users = []; // { id, email, passwordHash, name }
let nextId = 1;

export async function createUser({ email, password, name }) {
  email = String(email).trim().toLowerCase();
  const exists = users.find((u) => u.email === email);
  if (exists) return null;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nextId++, email, passwordHash, name };
  users.push(user);
  return user;
}

export function findUserByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return users.find((u) => u.email === e);
}

// Render's free disk is ephemeral, so users vanish on every restart/redeploy.
// Set ADMIN_EMAIL + ADMIN_PASSWORD (+ optional ADMIN_NAME) in Render env vars and
// this account is re-created automatically on every boot.
export async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  const created = await createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME || "Admin" });
  console.log(created ? `[auth] seeded admin account ${ADMIN_EMAIL}` : "[auth] admin account already exists");
}

export function findUserById(id) {
  return users.find((u) => u.id === id);
}