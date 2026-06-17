import { analyzeWithGemini, readJsonBody, sanitizeErrorForLog, sendJson } from "./_gemini.js";

const TELEGRAM_API_URL = "https://api.telegram.org";
const MAX_TELEGRAM_IMAGE_BYTES = 4_000_000;

const riskLabels = {
  baixo: "baixo",
  medio: "medio",
  alto: "alto",
};

const categoryLabels = {
  saude: "saude",
  politica: "politica",
  golpe: "golpe financeiro",
  corrente: "corrente emocional",
  noticia_sem_fonte: "noticia sem fonte",
  acusacao_grave: "acusacao grave",
  imagem_fora_de_contexto: "imagem fora de contexto",
  link_suspeito: "link suspeito",
  outro: "outro",
};

function readEnv(name) {
  const value = process.env[name];
  return value && value !== "undefined" && value !== "null" ? value : "";
}

function getHeader(request, name) {
  const value = request.headers[name.toLowerCase()] || request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function extractUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
  return match?.[0] || "";
}

function buildUsageMessage() {
  return [
    "Confere Agora",
    "",
    "Envie um texto, link ou imagem para receber um laudo curto.",
    "",
    "O resultado indica risco e sinais de checagem. Ele não substitui fontes oficiais ou agências de verificação.",
  ].join("\n");
}

function buildBotLocalResult(mode, input) {
  return {
    source: "bot",
    type: mode,
    risk: { level: "medio", score: 45 },
    confidence: "baixa",
    summary: "Não é possível confirmar somente com o conteúdo enviado.",
    mainReason: "O conteudo precisa de checagem antes do compartilhamento.",
    categories: ["outro"],
    isNewsLike: {
      status: "indefinido",
      detail: "Faltam elementos para confirmar se o material veio de uma noticia.",
    },
    signals: [
      {
        id: "bot-input",
        title: "Conteúdo recebido pelo bot",
        severity: "medio",
        detail: String(input || "Imagem enviada").slice(0, 160),
        recommendation: "Confira fonte, data, autoria e contexto antes de compartilhar.",
      },
    ],
    verificationSteps: [
      "Verificar a fonte original",
      "Procurar data, autor e contexto",
      "Comparar com fontes confiaveis",
    ],
  };
}

function formatAnalysisMessage(analysis) {
  const categories = (analysis.categories || [])
    .map((category) => categoryLabels[category] || category)
    .slice(0, 4)
    .join(", ");
  const signals = (analysis.signals || []).slice(0, 3);
  const steps = (analysis.verificationSteps || []).slice(0, 3);
  const extractedText = analysis.extractedText ? `\nTexto lido na imagem: ${analysis.extractedText}` : "";

  return [
    "Confere Agora - laudo curto",
    "",
    `Risco: ${riskLabels[analysis.level] || analysis.level} (${analysis.score}/100)`,
    `Motivo principal: ${analysis.mainReason || analysis.summary}`,
    `Resumo: ${analysis.summary}`,
    categories ? `Categorias: ${categories}` : "",
    extractedText,
    "",
    "Sinais encontrados:",
    ...signals.map((signal) => `- ${signal.title}: ${signal.detail}`),
    "",
    "Próximos passos:",
    ...steps.map((step) => `- ${step}`),
    "",
    "Use este resultado como alerta de risco, não como veredito definitivo.",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 3900);
}

async function telegramRequest(token, method, payload) {
  const response = await fetch(`${TELEGRAM_API_URL}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Telegram respondeu com status ${response.status}.`);
  }

  return response.json();
}

async function sendTelegramMessage(token, chatId, text) {
  return telegramRequest(token, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function downloadTelegramImageDataUrl(token, photo) {
  if (!photo?.file_id) {
    return "";
  }

  if (photo.file_size && photo.file_size > MAX_TELEGRAM_IMAGE_BYTES) {
    throw new Error("A imagem enviada é grande demais para verificação pelo bot.");
  }

  const fileInfo = await telegramRequest(token, "getFile", { file_id: photo.file_id });
  const filePath = fileInfo?.result?.file_path;

  if (!filePath) {
    throw new Error("Não foi possível obter a imagem enviada.");
  }

  const response = await fetch(`${TELEGRAM_API_URL}/file/bot${token}/${filePath}`);

  if (!response.ok) {
    throw new Error("Não foi possível baixar a imagem enviada.");
  }

  const contentLength = Number(response.headers.get("content-length") || 0);

  if (contentLength > MAX_TELEGRAM_IMAGE_BYTES) {
    throw new Error("A imagem enviada é grande demais para verificação pelo bot.");
  }

  const mimeType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_TELEGRAM_IMAGE_BYTES) {
    throw new Error("A imagem enviada é grande demais para verificação pelo bot.");
  }

  return `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
}

function getMessage(update) {
  return update.message || update.edited_message || update.channel_post || update.edited_channel_post || null;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Método não permitido." });
    return;
  }

  const token = readEnv("TELEGRAM_BOT_TOKEN");

  if (!token) {
    sendJson(response, 500, { ok: false, error: "TELEGRAM_BOT_TOKEN não configurado." });
    return;
  }

  const expectedSecret = readEnv("TELEGRAM_WEBHOOK_SECRET");
  const receivedSecret = getHeader(request, "x-telegram-bot-api-secret-token");

  if (expectedSecret && receivedSecret !== expectedSecret) {
    sendJson(response, 401, { ok: false, error: "Webhook não autorizado." });
    return;
  }

  let update = null;

  try {
    update = await readJsonBody(request);
    const message = getMessage(update);
    const chatId = message?.chat?.id;

    if (!chatId) {
      sendJson(response, 200, { ok: true, skipped: true });
      return;
    }

    const text = message.text || message.caption || "";

    if (text.trim().startsWith("/start") || text.trim().startsWith("/help")) {
      await sendTelegramMessage(token, chatId, buildUsageMessage());
      sendJson(response, 200, { ok: true });
      return;
    }

    const photos = Array.isArray(message.photo) ? message.photo : [];
    const selectedPhoto = photos[photos.length - 1];
    const linkUrl = extractUrl(text);
    const mode = selectedPhoto ? "foto" : linkUrl ? "link" : "texto";

    if (!selectedPhoto && !text.trim()) {
      await sendTelegramMessage(token, chatId, buildUsageMessage());
      sendJson(response, 200, { ok: true });
      return;
    }

    await sendTelegramMessage(token, chatId, "Recebi. Vou gerar um laudo curto de risco.");

    const imageDataUrl = selectedPhoto ? await downloadTelegramImageDataUrl(token, selectedPhoto) : "";
    const input = selectedPhoto ? text || "Imagem enviada pelo Telegram" : linkUrl || text;
    const payload = {
      mode,
      text: mode === "texto" ? text : "",
      linkUrl: mode === "link" ? linkUrl : "",
      photoDescription: mode === "foto" ? text : "",
      imageDataUrl,
      localResult: buildBotLocalResult(mode, input),
    };

    const analysis = await analyzeWithGemini(payload);
    await sendTelegramMessage(token, chatId, formatAnalysisMessage(analysis));
    sendJson(response, 200, { ok: true });
  } catch (error) {
    console.warn("[confere-agora] telegram webhook fallback", sanitizeErrorForLog(error));
    const chatId = getMessage(update)?.chat?.id;

    if (chatId) {
      await sendTelegramMessage(
        token,
        chatId,
        "Não consegui concluir a verificação agora. Tente novamente em instantes ou use o site Confere Agora.",
      ).catch(() => {});
    }

    sendJson(response, 200, { ok: false, error: error.message });
  }
}
