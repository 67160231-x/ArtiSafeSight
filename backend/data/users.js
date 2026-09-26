import bcrypt from "bcryptjs";

// In-memory user store — swap for a real DB (SQLite/Postgres) later.
// The function signatures below are what the rest of the app depends on,
// so you can change the internals without touching auth.js.
const users = []; // { id, email, passwordHash, name }
let nextId = 1;

export async function createUser({ email, password, name }) {
  const exists = users.find((u) => u.email === email);
  if (exists) return null;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nextId++, email, passwordHash, name };
  users.push(user);
  return user;
}

export function findUserByEmail(email) {
  return users.find((u) => u.email === email);
}

export function findUserById(id) {
  return users.find((u) => u.id === id);
}