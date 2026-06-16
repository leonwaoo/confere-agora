import { analyzeWithGemini, readJsonBody, sendJson } from "./_gemini.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Metodo nao permitido." });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const analysis = await analyzeWithGemini(payload);
    sendJson(response, 200, { ok: true, analysis });
  } catch (error) {
    sendJson(response, 200, {
      ok: false,
      error:
        error.name === "AbortError"
          ? "A verificacao complementar demorou para responder."
          : "A verificacao complementar nao respondeu agora. Use o resultado por regras e tente novamente em instantes.",
    });
  }
}
