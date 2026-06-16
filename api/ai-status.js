import { getCloudAiConfig, sendJson } from "./_gemini.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { ok: false, error: "Metodo nao permitido." });
    return;
  }

  const config = getCloudAiConfig();

  sendJson(response, 200, {
    ok: Boolean(config.apiKey),
    needsApiKey: !config.apiKey,
  });
}
