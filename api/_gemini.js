import { lookup } from "node:dns/promises";
import net from "node:net";

export const analysisSchema = {
  type: "object",
  properties: {
    level: { type: "string", enum: ["baixo", "medio", "alto"] },
    score: { type: "number" },
    confidence: { type: "string", enum: ["baixa", "media", "alta"] },
    summary: { type: "string" },
    mainReason: { type: "string" },
    categories: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "saude",
          "politica",
          "golpe",
          "corrente",
          "noticia_sem_fonte",
          "acusacao_grave",
          "imagem_fora_de_contexto",
          "link_suspeito",
          "outro",
        ],
      },
    },
    isNewsLike: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["parece_noticia", "nao_parece_noticia", "indefinido"] },
        detail: { type: "string" },
      },
      required: ["status", "detail"],
    },
    plausibility: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["plausivel", "improvavel", "absurdo", "indefinido"] },
        detail: { type: "string" },
      },
      required: ["status", "detail"],
    },
    extractedText: { type: "string" },
    signals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          severity: { type: "string", enum: ["baixo", "medio", "alto"] },
          detail: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["title", "severity", "detail", "recommendation"],
      },
    },
    verificationSteps: {
      type: "array",
      items: { type: "string" },
    },
    limitations: { type: "string" },
  },
  required: [
    "level",
    "score",
    "confidence",
    "summary",
    "mainReason",
    "categories",
    "isNewsLike",
    "plausibility",
    "extractedText",
    "signals",
    "verificationSteps",
    "limitations",
  ],
};

const scoreRanges = {
  baixo: { min: 0, max: 33 },
  medio: { min: 34, max: 64 },
  alto: { min: 65, max: 100 },
};

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

function readEnv(name) {
  const value = process.env[name];

  if (!value || value === "undefined" || value === "null") {
    return "";
  }

  return value;
}

const systemPrompt = `
Voce e um analista de risco de desinformacao para conteudos publicos no Brasil.

Regras:
- Nao diga que algo e verdadeiro ou falso de forma definitiva.
- Nao use termos como "falso", "inveridico", "verdadeiro", "mentira comprovada" ou "veredito".
- Use linguagem de risco: "alto risco", "sem fonte verificavel", "necessita checagem", "conteudo perigoso para compartilhar sem verificacao".
- Classifique o risco de circulacao do conteudo: baixo, medio ou alto.
- Acusacoes factuais graves contra pessoas, empresas, instituicoes ou figuras publicas sem fonte verificavel devem ser no minimo risco alto.
- Exemplos de acusacao grave: matou, mandou matar, roubou, fraudou, cometeu crime, desviou dinheiro, adulterou dados, manipulou resultados.
- Textos curtos com acusacao grave sem fonte nao devem ser tratados como baixo risco.
- Se houver imagem, considere texto visivel, contexto visual, cortes, ausencia de fonte, sinais de print/card e possivel falta de contexto.
- Se houver link, avalie titulo, descricao e trecho extraido da pagina. Considere dominio, autoria, data, fonte primaria e sinais de clickbait.
- Se houver data de publicacao no link, compare com a data atual do Brasil enviada no prompt. Nao classifique como futuro quando a data for o mesmo dia no Brasil.
- Se a data estiver em formato ambiguo ou sem fuso horario, diga que a data exige conferencia em vez de afirmar que esta no futuro.
- Se houver imagem, extraia no campo extractedText o texto visivel que conseguir ler. Se nao houver texto, retorne string vazia.
- Avalie se o material parece uma noticia jornalistica real: use isNewsLike.status como parece_noticia, nao_parece_noticia ou indefinido.
- Avalie tambem se a alegacao parece plausivel, improvavel, absurda ou indefinida no campo plausibility.
- Use plausibility.status="absurdo" quando a mensagem contrariar conhecimento basico ou fizer promessa extrema sem mecanismo plausivel, como cura milagrosa em poucos dias, premio impossivel, conspiracao totalizante ou fato fisicamente improvavel.
- Use plausibility.status="improvavel" quando a mensagem ate poderia ocorrer, mas faltam evidencias, fonte, contexto, metodo ou confirmacao independente.
- Use plausibility.status="plausivel" somente quando o conteudo for coerente, especifico e apoiado por dados lidos no link, fonte ou contexto enviado.
- Se faltar contexto para julgar plausibilidade, use plausibility.status="indefinido" e explique a limitacao.
- Diferencie tipos de risco em categories: saude, politica, golpe, corrente, noticia_sem_fonte, acusacao_grave, imagem_fora_de_contexto, link_suspeito ou outro.
- Responda em portugues do Brasil.
- Retorne somente JSON aderente ao schema.
- Seja conciso: resumo com 1 frase objetiva, motivo principal com 1 frase curta, no maximo 3 sinais e no maximo 3 proximas checagens.
- O campo summary deve comecar com uma destas formulas objetivas: "Há risco alto", "Há risco médio", "Há risco baixo", "Não é possível confirmar" ou "Faltam evidências".
- Nao repita o mesmo motivo em sinais diferentes.
- Use apenas evidencias presentes no texto, imagem, link ou conteudo extraido. Se algo nao foi lido, indique em limitations.
- Score deve combinar com level: baixo 0-33, medio 34-64, alto 65-100.
- Se a evidencia for fraca, prefira cautela e classifique como medio em vez de alto.
- Classifique como alto quando houver acusacao grave sem fonte, promessa de cura/tratamento, golpe, fraude, pedido urgente de repasse ou dano potencial relevante.
`;

function getBrazilDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }

      return acc;
    }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    label: `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function dateOnlyUtc(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function parseBrazilianDateOnly(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return {
      date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const brMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (brMatch) {
    const year = Number(brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3]);
    const month = Number(brMatch[2]);
    const day = Number(brMatch[1]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        year,
        month,
        day,
      };
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return getBrazilDateParts(parsed);
  }

  return null;
}

export function classifyPublishedDate(publishedDate, now = new Date()) {
  const today = getBrazilDateParts(now);
  const published = parseBrazilianDateOnly(publishedDate);

  if (!published) {
    return {
      status: "indefinido",
      today: today.date,
      label: "Data nao interpretada automaticamente.",
    };
  }

  const diffDays = Math.round((dateOnlyUtc(published) - dateOnlyUtc(today)) / 86_400_000);

  if (diffDays > 0) {
    return {
      status: "futuro",
      today: today.date,
      publishedDate: published.date,
      diffDays,
      label: "A data publicada parece posterior a data atual no Brasil.",
    };
  }

  if (diffDays === 0) {
    return {
      status: "hoje",
      today: today.date,
      publishedDate: published.date,
      diffDays,
      label: "A data publicada e de hoje no Brasil.",
    };
  }

  return {
    status: "passado",
    today: today.date,
    publishedDate: published.date,
    diffDays,
    label: "A data publicada e anterior a data atual no Brasil.",
  };
}

export function getCloudAiConfig() {
  return {
    provider: "Gemini API",
    model: readEnv("CLOUD_AI_MODEL") || readEnv("GEMINI_MODEL") || "gemini-3.5-flash",
    apiKey: readEnv("CLOUD_AI_API_KEY") || readEnv("GEMINI_API_KEY"),
    baseUrl: readEnv("GEMINI_API_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta",
  };
}

export function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return null;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

export function buildPrompt(payload) {
  const currentBrazilDate = getBrazilDateParts();
  const input = {
    tipo: payload.mode,
    contexto_temporal: {
      data_atual_brasil: currentBrazilDate.date,
      data_hora_atual_brasil: currentBrazilDate.label,
      regra: "Compare datas de noticias usando esta data atual no Brasil. So chame de futuro se o status temporal extraido confirmar futuro.",
    },
    texto: payload.text || "",
    link_url: payload.linkUrl || "",
    conteudo_extraido_do_link: payload.linkContent || null,
    texto_descrito_da_imagem: payload.photoDescription || "",
    sinais_iniciais_do_navegador: payload.localResult || null,
  };

  return `
Analise o conteudo abaixo como possivel desinformacao. Use os sinais iniciais apenas como apoio; corrija a classificacao se eles estiverem subestimando o risco.

${JSON.stringify(input, null, 2)}
`;
}

export function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return Promise.resolve(request.body);
  }

  if (request.body && typeof request.body === "string") {
    try {
      return Promise.resolve(JSON.parse(request.body));
    } catch {
      return Promise.reject(new Error("JSON invalido."));
    }
  }

  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 8_000_000) {
        reject(new Error("Payload muito grande. Use uma imagem menor."));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });

    request.on("error", reject);
  });
}

export function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function normalizeGeminiJson(text) {
  const trimmed = String(text || "").trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(withoutFence);
}

function cleanText(value, maxLength, fallback = "") {
  const text = String(value || fallback)
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  const clipped = text.slice(0, maxLength - 3).trim();
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("! "), clipped.lastIndexOf("? "));

  if (sentenceEnd > maxLength * 0.45) {
    return clipped.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = clipped.lastIndexOf(" ");
  const safeClip = lastSpace > maxLength * 0.55 ? clipped.slice(0, lastSpace) : clipped;

  return `${safeClip.trim()}...`;
}

function normalizeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeScore(score, level) {
  const rawScore = Number(score);
  const percentScore = rawScore > 0 && rawScore <= 1 ? rawScore * 100 : rawScore;
  const range = scoreRanges[level] || scoreRanges.medio;
  const bounded = Math.round(Math.max(0, Math.min(100, percentScore || range.min)));

  return Math.max(range.min, Math.min(range.max, bounded));
}

const allowedCategories = [
  "saude",
  "politica",
  "golpe",
  "corrente",
  "noticia_sem_fonte",
  "acusacao_grave",
  "imagem_fora_de_contexto",
  "link_suspeito",
  "outro",
];

function normalizeCategories(categories) {
  const normalized = Array.isArray(categories)
    ? categories.filter((category) => allowedCategories.includes(category)).slice(0, 4)
    : [];

  return normalized.length > 0 ? normalized : ["outro"];
}

function normalizeNewsLike(value) {
  const status = normalizeEnum(value?.status, ["parece_noticia", "nao_parece_noticia", "indefinido"], "indefinido");

  return {
    status,
    detail: cleanText(
      value?.detail,
      160,
      "Nao ha informacao suficiente para confirmar se o material segue formato jornalistico.",
    ),
  };
}

function normalizePlausibility(value, level) {
  const status = normalizeEnum(
    value?.status,
    ["plausivel", "improvavel", "absurdo", "indefinido"],
    level === "alto" ? "improvavel" : "indefinido",
  );

  const fallback =
    status === "absurdo"
      ? "A mensagem apresenta uma alegacao extrema ou pouco coerente com o contexto disponivel."
      : status === "improvavel"
        ? "A mensagem pode ate ser possivel, mas faltam evidencias suficientes para confiar nela."
        : status === "plausivel"
          ? "A mensagem parece coerente com os dados lidos, mas ainda exige fonte e contexto."
          : "Falta contexto suficiente para julgar se a mensagem e plausivel ou absurda.";

  return {
    status,
    detail: cleanText(value?.detail, 180, fallback),
  };
}

function normalizeObjectiveSummary(summary, level) {
  const text = cleanText(
    summary,
    220,
    "A verificacao encontrou pontos que pedem cautela antes do compartilhamento.",
  );
  const startsObjectively = /^(Há risco alto|Há risco médio|Há risco baixo|Não é possível confirmar|Faltam evidências|Ha risco alto|Ha risco medio|Ha risco baixo|Nao e possivel confirmar|Faltam evidencias)/i.test(
    text,
  );

  if (startsObjectively) {
    return text;
  }

  const prefix =
    level === "alto" ? "Há risco alto" : level === "medio" ? "Faltam evidências" : "Não é possível confirmar";

  return cleanText(`${prefix}: ${text}`, 240);
}

function normalizeSignal(signal, index) {
  const severity = normalizeEnum(signal?.severity, ["baixo", "medio", "alto"], "medio");

  return {
    title: cleanText(signal?.title, 80, `Sinal ${index + 1}`),
    severity,
    detail: cleanText(signal?.detail, 190, "O conteudo exige verificacao antes do compartilhamento."),
    recommendation: cleanText(signal?.recommendation, 160, "Confira fonte, data e contexto antes de compartilhar."),
  };
}

function normalizeAnalysis(analysis) {
  const level = normalizeEnum(analysis?.level, ["baixo", "medio", "alto"], "medio");
  const confidence = normalizeEnum(analysis?.confidence, ["baixa", "media", "alta"], "media");
  const signals = Array.isArray(analysis?.signals)
    ? analysis.signals.slice(0, 3).map(normalizeSignal)
    : [];
  const verificationSteps = Array.isArray(analysis?.verificationSteps)
    ? analysis.verificationSteps
        .map((step) => cleanText(step, 120))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (signals.length === 0) {
    signals.push(
      normalizeSignal(
        {
          severity: level,
          title: "Checagem necessaria",
          detail: "A verificacao complementar nao retornou sinais detalhados suficientes.",
          recommendation: "Tente novamente e confira a fonte original antes de compartilhar.",
        },
        0,
      ),
    );
  }

  return {
    level,
    score: normalizeScore(analysis?.score, level),
    confidence,
    summary: normalizeObjectiveSummary(analysis?.summary, level),
    mainReason: cleanText(
      analysis?.mainReason,
      160,
      signals[0]?.title || "O conteudo precisa de checagem antes do compartilhamento.",
    ),
    categories: normalizeCategories(analysis?.categories),
    isNewsLike: normalizeNewsLike(analysis?.isNewsLike),
    plausibility: normalizePlausibility(analysis?.plausibility, level),
    extractedText: cleanText(analysis?.extractedText, 320, ""),
    signals,
    verificationSteps:
      verificationSteps.length > 0
        ? verificationSteps
        : ["Conferir a fonte original", "Verificar data e contexto", "Comparar com fonte confiavel"],
    limitations: cleanText(
      analysis?.limitations,
      180,
      "Analise limitada ao conteudo enviado e aos dados disponiveis no momento.",
    ),
  };
}

function extractTextFromGemini(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("").trim();
}

function normalizeLinkMetadata(linkContent) {
  if (!linkContent || linkContent.readError) {
    return linkContent
      ? {
          url: linkContent.url || "",
          readError: cleanText(linkContent.readError, 160),
        }
      : null;
  }

  return {
    url: linkContent.url || "",
    finalUrl: linkContent.finalUrl || "",
    domain: cleanText(linkContent.domain, 80),
    siteName: cleanText(linkContent.siteName, 90),
    title: cleanText(linkContent.title || linkContent.h1, 160),
    description: cleanText(linkContent.description, 220),
    author: cleanText(linkContent.author, 100),
    publishedDate: cleanText(linkContent.publishedDate, 80),
    publishedDateStatus: linkContent.publishedDateStatus || null,
    canonicalUrl: linkContent.canonicalUrl || "",
  };
}

const fallbackModelIds = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-3.5-flash",
];
const HEALTH_CACHE_MS = 5 * 60 * 1000;
let healthCache = null;

export function getModelCandidates(config) {
  return [...new Set([config.model, ...fallbackModelIds].filter(Boolean))];
}

export function sanitizeErrorForLog(error) {
  return cleanText(error?.message || error, 260)
    .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted-api-key]")
    .replace(/AQ\.[0-9A-Za-z_.-]+/g, "[redacted-token]");
}

export function shouldTryNextModel(error) {
  const message = String(error?.message || "").toLowerCase();

  if (/(api key|permission|billing|unauthorized|forbidden)/i.test(message)) {
    return false;
  }

  if (/quota/i.test(message)) {
    return false;
  }

  return [400, 404, 429, 500, 502, 503, 504].includes(error?.status);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function parseServiceError(response) {
  let details = "";

  try {
    const data = await response.json();
    details = data?.error?.message || JSON.stringify(data?.error || data);
  } catch {
    details = await response.text().catch(() => "");
  }

  const error = new Error(
    cleanText(`Servico de verificacao respondeu com status ${response.status}. ${details}`, 360),
  );
  error.status = response.status;
  return error;
}

async function checkModel(config, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);

  try {
    const response = await fetch(`${config.baseUrl}/models/${model}`, {
      method: "GET",
      headers: {
        "x-goog-api-key": config.apiKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await parseServiceError(response);
    }

    return true;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkCloudAiHealth() {
  const config = getCloudAiConfig();

  if (!config.apiKey) {
    return { ok: false, needsApiKey: true };
  }

  const cacheKey = `${config.baseUrl}:${config.model}:${config.apiKey.slice(0, 8)}`;

  if (healthCache?.cacheKey === cacheKey && Date.now() - healthCache.checkedAt < HEALTH_CACHE_MS) {
    return healthCache.result;
  }

  let lastError = null;

  for (const model of getModelCandidates(config)) {
    try {
      await checkModel(config, model);
      const result = { ok: true, needsApiKey: false };
      healthCache = { cacheKey, checkedAt: Date.now(), result };
      return result;
    } catch (error) {
      lastError = error;

      if (!shouldTryNextModel(error)) {
        break;
      }

      await delay(250);
    }
  }

  const result = {
    ok: false,
    needsApiKey: false,
    error: "A verificacao complementar nao respondeu agora.",
  };
  healthCache = { cacheKey, checkedAt: Date.now(), result };
  console.warn("[confere-agora] cloud ai health failed", sanitizeErrorForLog(lastError));
  return result;
}

function normalizeHostname(hostname) {
  return String(hostname || "").replace(/^\[|\]$/g, "").toLowerCase();
}

function isPrivateIp(address) {
  const normalized = normalizeHostname(address);
  const version = net.isIP(normalized);

  if (version === 4) {
    const [a, b] = normalized.split(".").map(Number);

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (version === 6) {
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }

  return false;
}

function isBlockedHostname(hostname) {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "metadata.google.internal"
  );
}

async function assertPublicHttpUrl(rawUrl) {
  let parsed;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Link invalido.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Use um link http ou https.");
  }

  const hostname = normalizeHostname(parsed.hostname);

  if (isBlockedHostname(hostname) || isPrivateIp(hostname)) {
    throw new Error("Este link nao pode ser lido pela verificacao.");
  }

  if (!net.isIP(hostname)) {
    const addresses = await lookup(hostname, { all: true });

    if (addresses.some((address) => isPrivateIp(address.address))) {
      throw new Error("Este link aponta para uma rede privada.");
    }
  }

  return parsed;
}

async function fetchSafeUrl(rawUrl, redirects = 0) {
  if (redirects > 3) {
    throw new Error("O link tem redirecionamentos demais.");
  }

  const parsed = await assertPublicHttpUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        Accept: "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8",
        "User-Agent": "ConfereAgoraBot/1.0",
      },
      redirect: "manual",
      signal: controller.signal,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location) {
        throw new Error("Redirecionamento sem destino.");
      }

      const nextUrl = new URL(location, parsed).toString();
      return fetchSafeUrl(nextUrl, redirects + 1);
    }

    return { response, finalUrl: parsed.toString() };
  } finally {
    clearTimeout(timeout);
  }
}

async function readLimitedText(response, maxBytes = 420_000) {
  if (!response.body?.getReader) {
    const text = await response.text();
    return text.slice(0, maxBytes);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    received += value.length;
    text += decoder.decode(value, { stream: true });

    if (received >= maxBytes) {
      await reader.cancel();
      break;
    }
  }

  return text + decoder.decode();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanArticleText(value) {
  return normalizeWhitespace(String(value || "").replace(/\[[^\]]+\]/g, " "));
}

function extractMetaContent(html, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escapedName}["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  return decodeHtmlEntities(match?.[1] || match?.[2] || "").trim();
}

function extractLinkHref(html, rel) {
  const escapedRel = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<link[^>]+rel=["'][^"']*${escapedRel}[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${escapedRel}[^"']*["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  return decodeHtmlEntities(match?.[1] || match?.[2] || "").trim();
}

function extractPublishedDate(html) {
  return (
    extractMetaContent(html, "article:published_time") ||
    extractMetaContent(html, "og:published_time") ||
    extractMetaContent(html, "datePublished") ||
    extractMetaContent(html, "pubdate") ||
    decodeHtmlEntities(
      html.match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i)?.[1] ||
        html.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1] ||
        "",
    )
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function flattenStructuredData(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenStructuredData(item));
  }

  if (typeof value !== "object") {
    return [];
  }

  return [value, ...flattenStructuredData(value["@graph"])];
}

function extractStructuredDataObjects(html) {
  const objects = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = regex.exec(html);

  while (match) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1]).trim());
      objects.push(...flattenStructuredData(parsed));
    } catch {
      // Dados estruturados quebrados nao devem impedir a leitura do HTML.
    }

    match = regex.exec(html);
  }

  return objects;
}

function getStructuredType(value) {
  const type = value?.["@type"];

  if (Array.isArray(type)) {
    return type.join(" ");
  }

  return String(type || "");
}

function readStructuredName(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(readStructuredName).filter(Boolean).join(", ");
  }

  return value.name || "";
}

function extractStructuredArticle(html) {
  const objects = extractStructuredDataObjects(html);
  const article =
    objects.find((item) => /newsarticle|reportagenewsarticle|article/i.test(getStructuredType(item))) ||
    objects.find((item) => item.articleBody || item.datePublished || item.headline);

  if (!article) {
    return null;
  }

  return {
    title: normalizeWhitespace(article.headline || article.name),
    description: normalizeWhitespace(article.description),
    author: normalizeWhitespace(readStructuredName(article.author)),
    publishedDate: normalizeWhitespace(article.datePublished),
    modifiedDate: normalizeWhitespace(article.dateModified),
    body: cleanArticleText(article.articleBody),
  };
}

function extractTagText(html, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = html.match(regex);

  return match ? stripHtml(match[1]) : "";
}

function stripHtml(html) {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractBestExcerpt(html, structuredArticle) {
  return (
    structuredArticle?.body ||
    extractTagText(html, "article") ||
    extractTagText(html, "main") ||
    stripHtml(html)
  ).slice(0, 3_200);
}

export function summarizeHtml(html, finalUrl) {
  const parsedUrl = new URL(finalUrl);
  const structuredArticle = extractStructuredArticle(html);
  const title = decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const h1 = decodeHtmlEntities(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const description =
    extractMetaContent(html, "description") ||
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "twitter:description");
  const siteName = extractMetaContent(html, "og:site_name") || parsedUrl.hostname.replace(/^www\./, "");
  const author =
    structuredArticle?.author ||
    extractMetaContent(html, "author") ||
    extractMetaContent(html, "article:author") ||
    extractMetaContent(html, "twitter:creator");
  const publishedDate = structuredArticle?.publishedDate || extractPublishedDate(html);
  const publishedDateStatus = classifyPublishedDate(publishedDate);
  const canonicalUrl = extractLinkHref(html, "canonical");
  const excerpt = extractBestExcerpt(html, structuredArticle);

  return {
    title: structuredArticle?.title || title,
    h1,
    description: structuredArticle?.description || description,
    siteName,
    domain: parsedUrl.hostname.replace(/^www\./, ""),
    author,
    publishedDate,
    publishedDateStatus,
    canonicalUrl: canonicalUrl ? new URL(canonicalUrl, parsedUrl).toString() : "",
    excerpt,
  };
}

export async function extractLinkContent(rawUrl) {
  if (!rawUrl) {
    return null;
  }

  try {
    const { response, finalUrl } = await fetchSafeUrl(rawUrl);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      throw new Error(`Nao foi possivel abrir o link. Status ${response.status}.`);
    }

    if (!/(text\/html|text\/plain|application\/xhtml\+xml)/i.test(contentType)) {
      throw new Error("O link nao parece ser uma pagina de texto.");
    }

    const html = await readLimitedText(response);

    return {
      url: rawUrl,
      finalUrl,
      statusCode: response.status,
      ...summarizeHtml(html, finalUrl),
    };
  } catch (error) {
    return {
      url: rawUrl,
      readError: error.name === "AbortError" ? "O link demorou para responder." : error.message,
    };
  }
}

async function generateContentWithModel(config, model, parts) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${config.baseUrl}/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        },
      }),
    });

    if (!response.ok) {
      throw await parseServiceError(response);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeWithGemini(payload) {
  const config = getCloudAiConfig();

  if (!config.apiKey) {
    throw new Error("A verificacao complementar ainda nao esta configurada neste ambiente.");
  }

  const linkContent = payload.mode === "link" ? await extractLinkContent(payload.linkUrl) : null;
  const enrichedPayload = linkContent ? { ...payload, linkContent } : payload;
  const image = parseDataUrl(payload.imageDataUrl);
  const parts = [{ text: buildPrompt(enrichedPayload) }];

  if (image) {
    parts.unshift({
      inline_data: {
        mime_type: image.mimeType,
        data: image.data,
      },
    });
  }

  let lastError = null;

  for (const model of getModelCandidates(config)) {
    try {
      const data = await generateContentWithModel(config, model, parts);
      const text = extractTextFromGemini(data);
      const parsed = normalizeAnalysis(normalizeGeminiJson(text));

      return {
        ...parsed,
        linkMetadata: normalizeLinkMetadata(linkContent),
      };
    } catch (error) {
      lastError = error;

      if (!shouldTryNextModel(error)) {
        break;
      }

      await delay(250);
    }
  }

  throw lastError || new Error("A verificacao complementar nao respondeu agora.");
}
