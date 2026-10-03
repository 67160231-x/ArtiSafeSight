// Thin wrapper around the backend REST API.
// In dev, Vite proxies /api -> http://localhost:4000 (see vite.config.js).
// In production, set VITE_API_URL to the deployed backend's base URL
// (e.g. https://artisafesight-backend.onrender.com/api).
const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getCameras: () => request("/cameras"),
  getCamera: (id) => request(`/cameras/${id}`),
  getAlerts: (severity = "all") => request(`/alerts?severity=${severity}`),
  acknowledgeAlert: (id) =>
    request(`/alerts/${id}/acknowledge`, { method: "PATCH" }),
  getStats: () => request("/stats"),
  getSettings: () => request("/settings"),
  updateSettings: (patch) =>
    request("/settings", { method: "PUT", body: JSON.stringify(patch) }),
  analyzeImage: async (file, cameraId, faceBlur = false) => {
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("image", file);
    if (cameraId) form.append("cameraId", cameraId);
    form.append("faceBlur", faceBlur ? "true" : "false");
    const res = await fetch(`${BASE}/detect`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 503) throw new Error(body.error || `Request failed: ${res.status}`);
    return body;
  }
};

export const authApi = {
  register: (data) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) })
};