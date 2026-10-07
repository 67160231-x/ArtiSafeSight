// LINE push notifications through the LINE Messaging API.
// (LINE Notify was shut down in March 2025, so this uses a Messaging API channel.)
//   LINE_CHANNEL_ACCESS_TOKEN  long-lived channel access token of your LINE Official Account
//   LINE_TO                    userId / groupId / roomId that should receive the message
// Without both variables the "LINE notifications" toggle still saves, but nothing is sent.

const COOLDOWN_MS = Number(process.env.LINE_COOLDOWN_SEC || 60) * 1000;
let lastSent = 0;

export function lineConfigured() {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_TO);
}

export async function pushLine(text, { force = false } = {}) {
  if (!lineConfigured()) return { sent: false, reason: "not_configured" };
  const now = Date.now();
  if (!force && now - lastSent < COOLDOWN_MS) return { sent: false, reason: "cooldown" };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ to: process.env.LINE_TO, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[line] push failed", res.status, body.slice(0, 200));
    return { sent: false, reason: "line_error", status: res.status };
  }
  lastSent = now;
  return { sent: true };
}
