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
- Se houver imagem, extraia no campo extractedText o texto visivel que conseguir ler. Se nao houver texto, retorne string vazia.
- Avalie se o material parece uma noticia jornalistica real: use isNewsLike.status como parece_noticia, nao_parece_noticia ou indefinido.
- Diferencie tipos de risco em categories: saude, politica, golpe, corrente, noticia_sem_fonte, acusacao_grave, imagem_fora_de_contexto, link_suspeito ou outro.
- Responda em portugues do Brasil.
- Retorne somente JSON aderente ao schema.
- Seja conciso: resumo com 1 frase objetiva, motivo principal com 1 frase curta, no maximo 3 sinais e no maximo 3 proximas checagens.
- O campo summary deve comecar com uma destas formulas objetivas: "Ha risco alto", "Ha risco medio", "Ha risco baixo", "Nao e possivel confirmar" ou "Faltam evidencias".
- Nao repita o mesmo motivo em sinais diferentes.
- Use apenas evidencias presentes no texto, imagem, link ou conteudo extraido. Se algo nao foi lido, indique em limitations.
- Score deve combinar com level: baixo 0-33, medio 34-64, alto 65-100.
- Se a evidencia for fraca, prefira cautela e classifique como medio em vez de alto.
- Classifique como alto quando houver acusacao grave sem fonte, promessa de cura/tratamento, golpe, fraude, pedido urgente de repasse ou dano potencial relevante.
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

function normalizeObjectiveSummary(summary, level) {
  const text = cleanText(
    summary,
    220,
    "A verificacao encontrou pontos que pedem cautela antes do compartilhamento.",
  );
  const startsObjectively = /^(Ha risco alto|Ha risco medio|Ha risco baixo|Nao e possivel confirmar|Faltam evidencias)/i.test(
    text,
  );

  if (startsObjectively) {
    return text;
  }

  const prefix =
    level === "alto" ? "Ha risco alto" : level === "medio" ? "Faltam evidencias" : "Nao e possivel confirmar";

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
          recommendation: "Use o resultado por regras e confira a fonte original.",
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
    canonicalUrl: linkContent.canonicalUrl || "",
  };
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

function summarizeHtml(html, finalUrl) {
  const parsedUrl = new URL(finalUrl);
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
    extractMetaContent(html, "author") ||
    extractMetaContent(html, "article:author") ||
    extractMetaContent(html, "twitter:creator");
  const publishedDate = extractPublishedDate(html);
  const canonicalUrl = extractLinkHref(html, "canonical");
  const excerpt = stripHtml(html).slice(0, 3_200);

  return {
    title,
    h1,
    description,
    siteName,
    domain: parsedUrl.hostname.replace(/^www\./, ""),
    author,
    publishedDate,
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

    return {
      ...parsed,
      linkMetadata: normalizeLinkMetadata(linkContent),
    };
  } finally {
    clearTimeout(timeout);
  }
}
