import { analyzeWithGemini, extractLinkContent, readJsonBody, sendJson } from "./_gemini.js";

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function getClientIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const realIp = request.headers["x-real-ip"];
  const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || realIp || request.socket?.remoteAddress;

  return String(rawIp || "unknown").split(",")[0].trim();
}

function checkRateLimit(request) {
  const now = Date.now();
  const ip = getClientIp(request);
  const current = rateLimitStore.get(ip);

  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  rateLimitStore.set(ip, current);
  return { allowed: true };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Método não permitido." });
    return;
  }

  const rateLimit = checkRateLimit(request);

  if (!rateLimit.allowed) {
    response.setHeader("Retry-After", String(rateLimit.retryAfter));
    sendJson(response, 429, {
      ok: false,
      error: "Muitas verificações em pouco tempo. Aguarde alguns minutos e tente novamente.",
    });
    return;
  }

  let payload = null;

  try {
    payload = await readJsonBody(request);
    const analysis = await analyzeWithGemini(payload);
    sendJson(response, 200, { ok: true, analysis });
  } catch (error) {
    const linkMetadata = payload?.mode === "link" ? await extractLinkContent(payload.linkUrl) : null;

    sendJson(response, 200, {
      ok: false,
      linkMetadata,
      error:
        error.name === "AbortError"
          ? "A verificação complementar demorou para responder."
          : "A verificação complementar não respondeu agora. Use o resultado por regras e tente novamente em instantes.",
    });
  }
}
