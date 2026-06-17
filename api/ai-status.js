import { checkCloudAiHealth, sendJson } from "./_gemini.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { ok: false, error: "Metodo nao permitido." });
    return;
  }

  const health = await checkCloudAiHealth();

  sendJson(response, 200, health);
}
