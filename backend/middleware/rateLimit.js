// Tiny fixed-window rate limiter (per IP, in memory). Enough to stop brute-force
// logins and upload spam on a single Render instance without another dependency.
export function rateLimit({ windowMs, max, name = "rate" }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: "Too many requests, slow down." });
    }
    next();
  };
}
