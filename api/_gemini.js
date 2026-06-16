import { lookup } from "node:dns/promises";
import net from "node:net";

export const analysisSchema = {
  type: "object",
  properties: {
    level: { type: "string", enum: ["baixo", "medio", "alto"] },
    score: { type: "number" },
    confidence: { type: "string", enum: ["baixa", "media", "alta"] },
    summary: { type: "string" },
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
  required: ["level", "score", "confidence", "summary", "signals", "verificationSteps", "limitations"],
};

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
- Responda em portugues do Brasil.
- Retorne somente JSON aderente ao schema.
`;

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
  const input = {
    tipo: payload.mode,
    texto: payload.text || "",
    link_url: payload.linkUrl || "",
    conteudo_extraido_do_link: payload.linkContent || null,
    texto_descrito_da_imagem: payload.photoDescription || "",
    resultado_das_regras_locais: payload.localResult || null,
  };

  return `
Analise o conteudo abaixo como possivel desinformacao. Use as regras locais apenas como apoio; corrija a classificacao se a regra local estiver subestimando o risco.

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

function normalizeAnalysis(analysis) {
  const rawScore = Number(analysis.score);
  const normalizedScore = rawScore > 0 && rawScore <= 1 ? rawScore * 100 : rawScore;

  return {
    ...analysis,
    score: Math.round(Math.max(0, Math.min(100, normalizedScore || 0))),
  };
}

function extractTextFromGemini(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("").trim();
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

function extractMetaContent(html, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escapedName}["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  return decodeHtmlEntities(match?.[1] || match?.[2] || "").trim();
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

function summarizeHtml(html) {
  const title = decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const h1 = decodeHtmlEntities(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const description =
    extractMetaContent(html, "description") ||
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "twitter:description");
  const excerpt = stripHtml(html).slice(0, 3_200);

  return { title, h1, description, excerpt };
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
      ...summarizeHtml(html),
    };
  } catch (error) {
    return {
      url: rawUrl,
      readError: error.name === "AbortError" ? "O link demorou para responder." : error.message,
    };
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${config.baseUrl}/models/${config.model}:generateContent`, {
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
      throw new Error(`Servico de verificacao respondeu com status ${response.status}.`);
    }

    const data = await response.json();
    const text = extractTextFromGemini(data);
    const parsed = normalizeAnalysis(normalizeGeminiJson(text));

    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}
