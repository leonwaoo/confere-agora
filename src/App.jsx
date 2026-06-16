import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  ImagePlus,
  Info,
  Link2,
  Loader2,
  Newspaper,
  RotateCcw,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";

const MIN_TEXT_LENGTH = 18;

const sampleText =
  "Levantamento mostra que 92% das pessoas mudaram de opinião, mas não informa instituto, amostra, data nem metodologia.";

const claimSample =
  "URGENTE! O Ministério da Saúde confirmou que água quente com limão cura câncer em 3 dias. Compartilhe antes que apaguem.";

const manipulationSample =
  "A mídia não quer que você veja este vídeo. Repasse para todos antes que apaguem.";

const riskStyles = {
  baixo: {
    label: "Baixo",
    text: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    bar: "bg-emerald-600",
    icon: CheckCircle2,
  },
  medio: {
    label: "Médio",
    text: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-200",
    bar: "bg-amber-500",
    icon: AlertTriangle,
  },
  alto: {
    label: "Alto",
    text: "text-rose-800",
    bg: "bg-rose-50",
    border: "border-rose-200",
    bar: "bg-rose-600",
    icon: ShieldAlert,
  },
};

const categoryLabels = {
  saude: "Saúde",
  politica: "Política",
  golpe: "Golpe financeiro",
  corrente: "Corrente emocional",
  noticia_sem_fonte: "Notícia sem fonte",
  acusacao_grave: "Acusação grave",
  imagem_fora_de_contexto: "Imagem fora de contexto",
  link_suspeito: "Link suspeito",
  outro: "Checagem geral",
};

const newsStatusContent = {
  parece_noticia: {
    label: "Parece notícia",
    detail: "Há sinais de formato jornalístico, mas isso não confirma a informação.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  nao_parece_noticia: {
    label: "Não parece notícia",
    detail: "O conteúdo se aproxima mais de mensagem, corrente, card ou opinião.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  indefinido: {
    label: "Formato indefinido",
    detail: "Faltam elementos para dizer se o material veio de uma notícia.",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

const sourceTerms = [
  "fonte",
  "segundo",
  "tse",
  "gov.br",
  "tribunal",
  "instituto",
  "registro",
  "link",
  "http",
  "https",
  "uol",
  "g1",
  "bbc",
  "folha",
  "estadao",
  "agencia",
];

const publicContextTerms = [
  "governo",
  "politico",
  "politica",
  "candidato",
  "candidata",
  "partido",
  "campanha",
  "prefeito",
  "vereador",
  "governador",
  "presidente",
  "deputado",
  "senador",
];

const publicFigureTerms = [
  "presidente",
  "ex-presidente",
  "ministro",
  "ministra",
  "deputado",
  "deputada",
  "senador",
  "senadora",
  "prefeito",
  "prefeita",
  "governador",
  "governadora",
  "vereador",
  "vereadora",
  "candidato",
  "candidata",
];

const healthTerms = [
  "saude",
  "ministerio da saude",
  "cancer",
  "vacina",
  "remedio",
  "doenca",
  "tratamento",
  "cura",
  "limão",
  "limao",
  "agua quente",
];

const seriousAccusationTerms = [
  "matou",
  "maou",
  "assassinou",
  "mandou matar",
  "roubou",
  "fraudou",
  "fraude",
  "criminoso",
  "crime",
  "estuprou",
  "comprou apoio",
  "desviou dinheiro",
  "adulterou dados",
  "golpe",
  "manipulacao",
];

const scamTerms = [
  "pix",
  "boleto",
  "senha",
  "cpf",
  "cartao",
  "banco",
  "brinde",
  "premio",
  "sorteio",
  "promocao",
  "gratis",
  "clique aqui",
  "resgate",
];

const newsFormatTerms = [
  "reportagem",
  "noticia",
  "jornal",
  "portal",
  "redacao",
  "editoria",
  "agencia",
  "publicado",
  "atualizado",
  "entrevista",
  "segundo",
  "apuracao",
];

const shortenerDomains = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "cutt.ly",
  "rebrand.ly",
  "encurtador.com.br",
];

const modeOptions = [
  {
    id: "texto",
    label: "Texto",
    icon: FileText,
    title: "Mensagem ou manchete",
    description: "Ideal para posts, legendas e textos recebidos por conversa.",
    emptyTitle: "Aguardando texto",
    emptyChecks: ["Fonte e data", "Tom emocional", "Acusações ou promessas"],
  },
  {
    id: "link",
    label: "Link",
    icon: Link2,
    title: "Página ou notícia",
    description: "A leitura segura tenta capturar título, descrição e trecho principal.",
    emptyTitle: "Aguardando link",
    emptyChecks: ["Domínio e HTTPS", "Título da página", "Conteúdo extraído"],
  },
  {
    id: "foto",
    label: "Foto",
    icon: Camera,
    title: "Imagem, print ou card",
    description: "Analisa origem, qualidade e texto visível quando houver imagem.",
    emptyTitle: "Aguardando imagem",
    emptyChecks: ["Origem visual", "Texto aparente", "Cortes e contexto"],
  },
];

const workflowItems = [
  ["01", "Entrada"],
  ["02", "Sinais"],
  ["03", "Risco"],
  ["04", "Checagens"],
];

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function buildSignal(id, severity, title, detail, recommendation) {
  const weight = { baixo: 8, medio: 18, alto: 32 }[severity];
  return { id, severity, title, detail, recommendation, weight };
}

function calculateRisk(signals, baseScore = 0) {
  const score = Math.min(
    100,
    Math.max(0, baseScore + signals.reduce((total, signal) => total + signal.weight, 0)),
  );

  if (score >= 65) {
    return { level: "alto", score };
  }

  if (score >= 34) {
    return { level: "medio", score };
  }

  return { level: "baixo", score };
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function inferRiskCategories(normalizedText, signals, mode = "texto") {
  const signalIds = signals.map((signal) => signal.id);
  const categories = [];

  if (hasAny(normalizedText, healthTerms)) {
    categories.push("saude");
  }

  if (hasAny(normalizedText, publicContextTerms) || hasAny(normalizedText, publicFigureTerms)) {
    categories.push("politica");
  }

  if (hasAny(normalizedText, scamTerms)) {
    categories.push("golpe");
  }

  if (signalIds.some((id) => ["urgent-share", "alarmist-language"].some((pattern) => id.includes(pattern)))) {
    categories.push("corrente");
  }

  if (signalIds.some((id) => ["missing-source", "survey-missing-data", "numbers-without-context"].some((pattern) => id.includes(pattern)))) {
    categories.push("noticia_sem_fonte");
  }

  if (signalIds.some((id) => ["serious-accusation", "public-figure-claim"].some((pattern) => id.includes(pattern)))) {
    categories.push("acusacao_grave");
  }

  if (mode === "foto" || signalIds.some((id) => id.includes("image-source") || id.includes("screenshot"))) {
    categories.push("imagem_fora_de_contexto");
  }

  if (mode === "link" || signalIds.some((id) => id.includes("shortened-link") || id.includes("not-https"))) {
    categories.push("link_suspeito");
  }

  return uniqueItems(categories).slice(0, 4).length ? uniqueItems(categories).slice(0, 4) : ["outro"];
}

function assessNewsLike(rawText, { mode = "texto", linkUrl = "" } = {}) {
  const original = String(rawText || "").trim();
  const text = normalizeText(`${original} ${linkUrl}`);
  const hasNewsSignals = hasAny(text, newsFormatTerms);
  const hasByline = /\bpor\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ]+/.test(original);
  const hasDate =
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(original) ||
    /\b\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}\b/i.test(original);
  const hasMessagePressure = /(compartilhe|repasse|envie para todos|antes que apaguem|nao deixe morrer)/i.test(text);
  const looksLikeNewsUrl = /(noticia|news|politica|saude|brasil|mundo|economia|reportagem)/i.test(linkUrl);

  if (mode === "link" && (hasNewsSignals || looksLikeNewsUrl)) {
    return {
      status: "parece_noticia",
      detail: "O link tem sinais de página jornalística; ainda é necessário conferir autoria, data e fonte primária.",
    };
  }

  if ((hasByline && hasDate) || (hasNewsSignals && hasDate)) {
    return {
      status: "parece_noticia",
      detail: "Há elementos de notícia, como data, autoria ou linguagem jornalística.",
    };
  }

  if (hasMessagePressure || (!hasNewsSignals && mode !== "link" && original.length >= MIN_TEXT_LENGTH)) {
    return {
      status: "nao_parece_noticia",
      detail: "O conteúdo não mostra elementos básicos de notícia, como veículo, autoria, data e contexto.",
    };
  }

  return {
    status: "indefinido",
    detail: "Faltam elementos para confirmar se o conteúdo veio de uma notícia.",
  };
}

function getMainReason(signals) {
  const strongest = [...signals].sort((a, b) => b.weight - a.weight)[0];
  return strongest?.title || "O conteúdo precisa de checagem antes de ser compartilhado.";
}

function buildResultExtras(rawText, signals, mode, context = {}) {
  const normalized = normalizeText(rawText || "");

  return {
    categories: inferRiskCategories(normalized, signals, mode),
    mainReason: getMainReason(signals),
    isNewsLike: assessNewsLike(rawText, { mode, linkUrl: context.linkUrl || "" }),
  };
}

function buildEvidenceBadges(result) {
  if (!result) {
    return [];
  }

  const badges = [];
  const signals = result.signals || [];
  const ids = signals.map((signal) => signal.id).join(" ");

  if (/missing-source|source-limit|noticia_sem_fonte/.test(ids) || result.categories?.includes("noticia_sem_fonte")) {
    badges.push("Fonte ausente");
  }

  if (/alarmist-language|urgent-share/.test(ids) || result.categories?.includes("corrente")) {
    badges.push("Apelo emocional");
  }

  if (/numbers-without-context|survey-missing-data/.test(ids)) {
    badges.push("Dados sem método");
  }

  if (result.categories?.includes("golpe")) {
    badges.push("Possível golpe");
  }

  if (result.categories?.includes("saude")) {
    badges.push("Saúde");
  }

  if (result.categories?.includes("politica")) {
    badges.push("Política");
  }

  if (result.categories?.includes("imagem_fora_de_contexto")) {
    badges.push("Imagem sem contexto");
  }

  if (result.categories?.includes("link_suspeito")) {
    badges.push("Link exige cautela");
  }

  return uniqueItems(badges).slice(0, 6);
}

function normalizeCategories(categories) {
  const normalized = Array.isArray(categories)
    ? categories.filter((category) => categoryLabels[category]).slice(0, 4)
    : [];

  return normalized.length > 0 ? normalized : ["outro"];
}

function normalizeNewsAssessment(value) {
  if (!value || !newsStatusContent[value.status]) {
    return newsStatusContent.indefinido
      ? {
          status: "indefinido",
          detail: newsStatusContent.indefinido.detail,
        }
      : null;
  }

  return {
    status: value.status,
    detail: value.detail || newsStatusContent[value.status].detail,
  };
}

function analyzeText(rawText) {
  const original = rawText.trim();
  const text = normalizeText(original);
  const signals = [];
  const hasSource = hasAny(text, sourceTerms) || /https?:\/\/\S+/i.test(original);
  const hasPublicContext = hasAny(text, publicContextTerms);
  const hasPublicFigure = hasAny(text, publicFigureTerms);
  const hasHealthContext = hasAny(text, healthTerms);
  const hasSeriousAccusation = hasAny(text, seriousAccusationTerms);
  const hasNumbers = /\b\d{1,3}([,.]\d+)?\s?%?\b/.test(original);
  const hasSurveyContext = /(pesquisa|levantamento|amostra|margem de erro|resultado)/i.test(text);
  const hasMiracleHealthClaim =
    hasHealthContext &&
    /(cura|curar|elimina|previne|tratamento milagroso|em \d+ dias|comprovou|confirmou)/i.test(text);

  if (original.length < MIN_TEXT_LENGTH) {
    signals.push(
      buildSignal(
        "short-text",
        hasSeriousAccusation ? "medio" : "baixo",
        "Pouco contexto",
        "O texto é curto e não oferece origem, data ou evidência suficiente.",
        "Compare com a publicação original antes de repassar.",
      ),
    );
  }

  if (hasSeriousAccusation && !hasSource) {
    signals.push(
      buildSignal(
        "serious-accusation",
        "alto",
        "Acusação grave sem evidência",
        "O conteúdo atribui crime, fraude ou violência sem apresentar fonte verificável.",
        "Procure documentos oficiais, reportagem confiável ou checagem independente.",
      ),
    );
  }

  if (hasMiracleHealthClaim && !/gov\.br|saude\.gov|ministerio da saude\.gov|artigo cientifico|estudo publicado/i.test(text)) {
    signals.push(
      buildSignal(
        "health-miracle-claim",
        "alto",
        "Promessa de saúde sem fonte confiável",
        "O conteúdo apresenta promessa de cura ou tratamento com linguagem de certeza, mas sem referência verificável.",
        "Não use nem compartilhe orientação de saúde sem confirmar em órgão oficial ou profissional qualificado.",
      ),
    );
  }

  if (hasPublicFigure && hasSeriousAccusation && !hasSource) {
    signals.push(
      buildSignal(
        "public-figure-claim",
        "alto",
        "Alegação contra figura pública",
        "Citações desse tipo podem causar dano reputacional e costumam circular fora de contexto.",
        "Verifique em fontes jornalísticas, judiciais ou órgãos oficiais antes de compartilhar.",
      ),
    );
  }

  if (
    /(compartilhe|repasse|envie para todos|espalhe|antes que apaguem|nao deixe morrer|todos precisam saber)/i.test(
      text,
    )
  ) {
    signals.push(
      buildSignal(
        "urgent-share",
        "alto",
        "Pedido de compartilhamento",
        "O conteúdo pressiona o leitor a repassar rapidamente.",
        "Evite compartilhar sob pressão e procure a fonte original.",
      ),
    );
  }

  if (
    /(urgente|bomba|escandalo|chocante|a midia nao mostra|a verdade que escondem|ultima chance|grave denuncia)/i.test(
      text,
    )
  ) {
    signals.push(
      buildSignal(
        "alarmist-language",
        "medio",
        "Linguagem alarmista",
        "Foram encontrados termos emocionais comuns em conteúdo manipulativo.",
        "Leia além da manchete e verifique se há dados concretos.",
      ),
    );
  }

  if (!hasSource && original.length >= MIN_TEXT_LENGTH) {
    signals.push(
      buildSignal(
        "missing-source",
        "medio",
        "Fonte não identificada",
        "Não há indicação clara de origem, veículo, órgão oficial ou link.",
        "Busque a mesma informação em fontes independentes e oficiais.",
      ),
    );
  }

  if (hasNumbers && !hasSource) {
    signals.push(
      buildSignal(
        "numbers-without-context",
        "medio",
        "Números sem origem",
        "O conteúdo usa números ou percentuais sem explicar de onde vieram.",
        "Confira metodologia, data, amostra e responsável pelo levantamento.",
      ),
    );
  }

  if (hasSurveyContext && !/(instituto|registro|amostra|margem de erro|data de coleta|metodologia)/i.test(text)) {
    signals.push(
      buildSignal(
        "survey-missing-data",
        "alto",
        "Pesquisa ou levantamento incompleto",
        "Há menção a pesquisa, levantamento ou resultado sem dados essenciais.",
        "Verifique instituto, registro, data de coleta, amostra e margem de erro.",
      ),
    );
  }

  if (hasPublicContext || hasPublicFigure) {
    signals.push(
      buildSignal(
        "public-context",
        "baixo",
        "Contexto público detectado",
        "Conteúdos sobre pessoas, instituições ou decisões públicas exigem checagem cuidadosa.",
        "Priorize fontes oficiais, veículos confiáveis e checagens independentes.",
      ),
    );
  }

  if (signals.length === 0) {
    signals.push(
      buildSignal(
        "no-obvious-risk",
        "baixo",
        "Nenhum sinal forte encontrado",
        "A análise por regras não encontrou alertas evidentes.",
        "Mesmo assim, confirme fonte, data e contexto antes de compartilhar.",
      ),
    );
  }

  const baseScore = hasPublicFigure && hasSeriousAccusation && !hasSource ? 20 : 0;
  const risk = calculateRisk(signals, baseScore);
  const extras = buildResultExtras(original, signals, "texto");

  return {
    source: "Regras locais",
    type: "texto",
    risk,
    confidence: hasSeriousAccusation || hasSurveyContext ? "alta" : "media",
    ...extras,
    verificationSteps: [
      "Procurar a fonte original",
      "Conferir data e contexto",
      "Comparar com pelo menos duas fontes confiáveis",
    ],
    signals,
    summary:
      risk.level === "alto"
        ? "Há sinais relevantes de risco. O conteúdo merece checagem antes de qualquer compartilhamento."
        : risk.level === "medio"
          ? "O conteúdo tem pontos que pedem cautela e verificação adicional."
          : "Poucos sinais de risco foram encontrados, mas a checagem da fonte continua importante.",
  };
}

function analyzePhoto(file, imageMeta, description) {
  const signals = [];
  const normalizedDescription = normalizeText(description);
  const hasDescription = description.trim().length >= MIN_TEXT_LENGTH;

  if (!file) {
    return null;
  }

  signals.push(
    buildSignal(
      "image-source-limit",
      "medio",
      "Origem não confirmada",
      "Uma imagem isolada raramente mostra toda a origem do conteúdo.",
      "Faça busca reversa e procure a publicação original.",
    ),
  );

  if (imageMeta?.width && imageMeta?.height) {
    const { width, height } = imageMeta;
    const aspectRatio = Math.max(width, height) / Math.min(width, height);

    if (width < 720 || height < 480) {
      signals.push(
        buildSignal(
          "low-resolution",
          "medio",
          "Resolução baixa",
          "A imagem pode dificultar leitura de detalhes, datas, fontes e contexto.",
          "Procure uma versão em melhor qualidade ou a publicação original.",
        ),
      );
    }

    if (aspectRatio > 1.85) {
      signals.push(
        buildSignal(
          "screenshot-shape",
          "baixo",
          "Formato típico de print",
          "A proporção da imagem lembra captura de tela ou recorte compartilhado.",
          "Verifique se o print mostra perfil, data, link e contexto completo.",
        ),
      );
    }
  }

  if (/whatsapp|screenshot|captura|print|telegram|img-/i.test(file.name)) {
    signals.push(
      buildSignal(
        "shared-file-name",
        "baixo",
        "Indício de imagem repassada",
        "O nome do arquivo sugere print, captura ou imagem recebida por aplicativo.",
        "Tente localizar a origem antes de confiar no conteúdo.",
      ),
    );
  }

  if (!hasDescription) {
    signals.push(
      buildSignal(
        "missing-image-text",
        "medio",
        "Texto da imagem não informado",
        "A verificação complementar pode ler a imagem quando estiver configurada; sem ela, a regra precisa de transcrição.",
        "Transcreva manchete, legenda ou texto visível para melhorar a análise local.",
      ),
    );
  }

  if (hasDescription) {
    const textResult = analyzeText(description);
    const imageTextSignals = textResult.signals
      .filter((signal) => signal.id !== "no-obvious-risk")
      .map((signal) => ({
        ...signal,
        id: `image-${signal.id}`,
        title: `Na imagem: ${signal.title}`,
      }));

    signals.push(...imageTextSignals);
  }

  if (hasAny(normalizedDescription, publicContextTerms) || hasAny(normalizedDescription, publicFigureTerms)) {
    signals.push(
      buildSignal(
        "image-public-context",
        "baixo",
        "Imagem com tema público",
        "O texto descrito menciona pessoa, instituição, partido, empresa ou figura pública.",
        "Use cautela extra e confira fontes confiáveis.",
      ),
    );
  }

  const risk = calculateRisk(signals, 6);
  const extras = buildResultExtras(description, signals, "foto");

  return {
    source: "Regras locais",
    type: "foto",
    risk,
    confidence: hasDescription ? "media" : "baixa",
    ...extras,
    verificationSteps: [
      "Fazer busca reversa da imagem",
      "Procurar a publicação original",
      "Verificar data, perfil, fonte e contexto",
    ],
    signals,
    summary:
      risk.level === "alto"
        ? "A imagem tem sinais importantes de risco ou pouco contexto verificável."
        : risk.level === "medio"
          ? "A imagem exige cautela, principalmente por origem, contexto ou dados incompletos."
          : "A imagem não apresentou sinais fortes, mas ainda precisa de confirmação de origem.",
  };
}

function parseUserUrl(rawUrl) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

function safeDecodeUrlText(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function analyzeLink(rawUrl) {
  const signals = [];
  const parsedUrl = parseUserUrl(rawUrl);

  if (!parsedUrl || !["http:", "https:"].includes(parsedUrl.protocol)) {
    signals.push(
      buildSignal(
        "invalid-link",
        "alto",
        "Link inválido",
        "O endereço informado não parece ser um link público em http ou https.",
        "Confira se o link foi colado completo antes de compartilhar.",
      ),
    );

    return {
      source: "Regras locais",
      type: "link",
      risk: calculateRisk(signals, 20),
      confidence: "media",
      categories: ["link_suspeito"],
      mainReason: "Link inválido",
      isNewsLike: {
        status: "indefinido",
        detail: "Não foi possível avaliar formato de notícia porque o link não foi reconhecido.",
      },
      verificationSteps: ["Conferir o endereço original", "Buscar a página em fontes confiáveis"],
      signals,
      summary: "Não foi possível reconhecer o link com segurança. Confira o endereço antes de abrir ou repassar.",
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const readableUrl = safeDecodeUrlText(
    `${parsedUrl.hostname} ${parsedUrl.pathname} ${parsedUrl.search}`.replace(/[._/?=&-]+/g, " "),
  );

  if (parsedUrl.protocol !== "https:") {
    signals.push(
      buildSignal(
        "not-https",
        "medio",
        "Link sem HTTPS",
        "A página usa um endereço sem conexão segura.",
        "Prefira abrir a versão HTTPS ou procure a mesma informação em fonte confiável.",
      ),
    );
  }

  if (shortenerDomains.includes(hostname)) {
    signals.push(
      buildSignal(
        "shortened-link",
        "medio",
        "Link encurtado",
        "Links encurtados escondem o destino final e dificultam avaliar a fonte.",
        "Abra com cautela e confirme o domínio real antes de compartilhar.",
      ),
    );
  }

  if (/(urgente|bomba|escandalo|promocao|gratis|ganhe|cura|milagre|apaguem|vazou)/i.test(readableUrl)) {
    signals.push(
      buildSignal(
        "sensational-url",
        "medio",
        "Endereço com linguagem apelativa",
        "O próprio link usa termos comuns em chamadas sensacionalistas ou enganosas.",
        "Confira título, autor, data e contexto antes de confiar no conteúdo.",
      ),
    );
  }

  const textSignals = analyzeText(readableUrl).signals
    .filter((signal) => !["missing-source", "no-obvious-risk"].includes(signal.id))
    .map((signal) => ({
      ...signal,
      id: `link-${signal.id}`,
      title: `No link: ${signal.title}`,
    }));

  signals.push(...textSignals);

  if (signals.length === 0) {
    signals.push(
      buildSignal(
        "link-needs-reading",
        "baixo",
        "Link reconhecido",
        "O endereço foi reconhecido, mas a confiabilidade depende do conteúdo da página.",
        "Leia a matéria completa e confira autor, data e fonte primária.",
      ),
    );
  }

  const risk = calculateRisk(signals, 4);
  const extras = buildResultExtras(readableUrl, signals, "link", { linkUrl: parsedUrl.toString() });

  return {
    source: "Regras locais",
    type: "link",
    risk,
    confidence: "media",
    ...extras,
    verificationSteps: [
      "Abrir a página original",
      "Conferir autor, data e veículo",
      "Comparar com fontes independentes ou oficiais",
    ],
    signals,
    summary:
      risk.level === "alto"
        ? "O link apresenta sinais fortes de risco e precisa de checagem antes de ser compartilhado."
        : risk.level === "medio"
          ? "O link tem pontos de atenção. Verifique origem, data e contexto."
          : "O link foi reconhecido sem sinais fortes no endereço, mas ainda precisa de leitura e confirmação.",
  };
}

function convertAiAnalysis(aiAnalysis) {
  if (!aiAnalysis) {
    return null;
  }

  const rawScore = Number(aiAnalysis.score) || 0;
  const normalizedScore = rawScore > 0 && rawScore <= 1 ? rawScore * 100 : rawScore;

  return {
    source: "Verificação complementar",
    type: "ia",
    confidence: aiAnalysis.confidence,
    risk: {
      level: aiAnalysis.level,
      score: Math.round(Math.max(0, Math.min(100, normalizedScore))),
    },
    summary: aiAnalysis.summary,
    mainReason: aiAnalysis.mainReason,
    categories: normalizeCategories(aiAnalysis.categories),
    isNewsLike: normalizeNewsAssessment(aiAnalysis.isNewsLike),
    extractedText: aiAnalysis.extractedText || "",
    linkMetadata: aiAnalysis.linkMetadata || null,
    verificationSteps: aiAnalysis.verificationSteps || [],
    limitations: aiAnalysis.limitations,
    signals: (aiAnalysis.signals || []).map((signal, index) => ({
      id: `ai-${index}`,
      severity: signal.severity,
      title: signal.title,
      detail: signal.detail,
      recommendation: signal.recommendation,
      weight: { baixo: 8, medio: 18, alto: 32 }[signal.severity] || 8,
    })),
  };
}

function chooseFinalResult(localResult, aiResult) {
  if (!aiResult) {
    return localResult;
  }

  const riskOrder = { baixo: 1, medio: 2, alto: 3 };
  const aiIsHigher = riskOrder[aiResult.risk.level] >= riskOrder[localResult.risk.level];
  const chosen = aiIsHigher ? aiResult : localResult;

  return {
    ...chosen,
    categories: uniqueItems([...(chosen.categories || []), ...(aiResult.categories || [])]).slice(0, 4),
    mainReason: chosen.mainReason || aiResult.mainReason || localResult.mainReason,
    isNewsLike: aiResult.isNewsLike || chosen.isNewsLike,
    extractedText: aiResult.extractedText || chosen.extractedText || "",
    linkMetadata: aiResult.linkMetadata || chosen.linkMetadata || null,
  };
}

function getModeLabel(mode) {
  return modeOptions.find((option) => option.id === mode)?.label || "Conteúdo";
}

function createReportText({ result, localResult, aiResult, mode, input }) {
  if (!result) {
    return "";
  }

  const news = result.isNewsLike ? newsStatusContent[result.isNewsLike.status] : null;
  const categories = (result.categories || []).map((category) => categoryLabels[category]).filter(Boolean);
  const badges = buildEvidenceBadges(result);
  const signals = (result.signals || []).slice(0, 3);
  const steps = (result.verificationSteps || []).slice(0, 3);
  const inputPreview = String(input || "").replace(/\s+/g, " ").trim().slice(0, 260);

  return [
    "Confere Agora - Relatório de checagem",
    `Data: ${new Date().toLocaleString("pt-BR")}`,
    `Entrada: ${getModeLabel(mode)}`,
    inputPreview ? `Conteúdo analisado: ${inputPreview}` : "",
    "",
    `Risco: ${riskStyles[result.risk.level]?.label || result.risk.level} (${result.risk.score}/100)`,
    `Motivo principal: ${result.mainReason || result.summary}`,
    `Resumo: ${result.summary}`,
    news ? `Formato de notícia: ${news.label} - ${result.isNewsLike.detail}` : "",
    categories.length ? `Categorias: ${categories.join(", ")}` : "",
    badges.length ? `Selos: ${badges.join(", ")}` : "",
    "",
    "Sinais encontrados:",
    ...signals.map((signal) => `- ${signal.title}: ${signal.detail}`),
    "",
    "Próximos passos:",
    ...steps.map((step) => `- ${step}`),
    "",
    `Regras locais: ${localResult?.risk?.score ?? "-"} / 100`,
    `Verificação complementar: ${aiResult?.risk?.score ?? "indisponível"} / 100`,
    "Observação: este relatório indica risco e pontos de checagem; ele não substitui fontes oficiais, jornalismo profissional ou agências de checagem.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    image.src = src;
  });
}

async function prepareImageForCloud(file) {
  const originalDataUrl = await fileToDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.84);

  return {
    dataUrl,
    meta: {
      width,
      height,
      type: "image/jpeg",
      size: Math.round((dataUrl.length * 3) / 4),
      originalWidth: image.naturalWidth,
      originalHeight: image.naturalHeight,
      originalSize: file.size,
    },
  };
}

function RiskPill({ level }) {
  const style = riskStyles[level] || riskStyles.baixo;
  const Icon = style.icon;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${style.bg} ${style.border} ${style.text}`}>
      <Icon size={14} />
      {style.label}
    </span>
  );
}

function StatusDot({ active }) {
  return (
    <span
      className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`}
      aria-hidden="true"
    />
  );
}

function ModeTabs({ activeMode, onChange }) {
  return (
    <div className="grid grid-cols-3 rounded-lg border border-teal-100 bg-[#eef7f4] p-1">
      {modeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = activeMode === option.id;

        return (
          <button
            className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition ${
              isActive ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-950"
            }`}
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
          >
            <Icon size={18} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ModeCards({ activeMode, onChange }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {modeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = activeMode === option.id;

        return (
          <button
            className={`group flex min-h-28 flex-col justify-between rounded-lg border p-4 text-left transition ${
              isActive
                ? "border-teal-500 bg-teal-50 text-teal-950 shadow-soft"
                : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-[#f8fbfa]"
            }`}
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
          >
            <span className="flex items-center justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${isActive ? "bg-white text-teal-700" : "bg-slate-50 text-slate-600"}`}>
                <Icon size={21} />
              </span>
              {isActive ? (
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-teal-700">Selecionado</span>
              ) : null}
            </span>
            <span>
              <span className="block text-base font-bold">{option.label}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">{option.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ mode }) {
  const activeMode = modeOptions.find((option) => option.id === mode) || modeOptions[0];
  const Icon = activeMode.icon;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon size={24} />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm">
            <Sparkles size={13} />
          </span>
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-950">{activeMode.emptyTitle}</h2>
          <p className="text-sm leading-6 text-slate-600">O painel de resultado aparece aqui após a checagem.</p>
        </div>
      </div>

      <div className="grid gap-2">
        {activeMode.emptyChecks.map((item) => (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700" key={item}>
            <CheckCircle2 className="text-teal-700" size={16} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultMeter({ result }) {
  const style = riskStyles[result.risk.level] || riskStyles.baixo;
  const Icon = style.icon;
  const actionLabel =
    result.risk.level === "alto"
      ? "Pausar e checar"
      : result.risk.level === "medio"
        ? "Conferir contexto"
        : "Seguir com cautela";

  return (
    <section className={`rounded-lg border p-4 shadow-soft ${style.bg} ${style.border}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-lg bg-white ${style.text}`}>
            <Icon size={24} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-500">Resultado final</p>
            <h2 className={`text-2xl font-bold ${style.text}`}>Risco {style.label}</h2>
          </div>
        </div>
        <span className={`rounded-full bg-white px-3 py-1 text-sm font-bold ${style.text}`}>
          {result.risk.score}/100
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div className={`risk-meter-fill h-full rounded-full ${style.bar}`} style={{ width: `${result.risk.score}%` }} />
      </div>
      <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
        {actionLabel}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-700">{result.summary}</p>
    </section>
  );
}

function EvidenceBadges({ result }) {
  const badges = buildEvidenceBadges(result);

  if (badges.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
        <ShieldCheck size={18} />
        Sinais de confiança
      </h3>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            className="inline-flex min-h-8 items-center rounded-full border border-teal-100 bg-[#f2fbf8] px-3 text-xs font-bold text-teal-800"
            key={badge}
          >
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}

function NewsAssessmentCard({ assessment }) {
  if (!assessment) {
    return null;
  }

  const content = newsStatusContent[assessment.status] || newsStatusContent.indefinido;

  return (
    <section className={`rounded-lg border p-4 ${content.className}`}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <Newspaper size={18} />
        {content.label}
      </h3>
      <p className="text-sm leading-6">{assessment.detail || content.detail}</p>
    </section>
  );
}

function LinkMetadataCard({ metadata }) {
  if (!metadata) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
        <Link2 size={18} />
        Dados lidos do link
      </h3>
      {metadata.readError ? (
        <p className="text-sm leading-6 text-amber-700">{metadata.readError}</p>
      ) : (
        <div className="space-y-2 text-sm leading-6 text-slate-700">
          {metadata.title ? <p><strong className="text-slate-950">Título:</strong> {metadata.title}</p> : null}
          {metadata.siteName || metadata.domain ? (
            <p><strong className="text-slate-950">Origem:</strong> {metadata.siteName || metadata.domain}</p>
          ) : null}
          {metadata.author ? <p><strong className="text-slate-950">Autor:</strong> {metadata.author}</p> : null}
          {metadata.publishedDate ? <p><strong className="text-slate-950">Data:</strong> {metadata.publishedDate}</p> : null}
        </div>
      )}
    </section>
  );
}

function ExtractedTextCard({ text }) {
  if (!text) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950">
        <FileText size={18} />
        Texto detectado na imagem
      </h3>
      <p className="text-sm leading-6 text-slate-700">{text}</p>
    </section>
  );
}

function ReportCard({ result, reportText, feedback, onCopy, onDownload }) {
  const categories = (result.categories || []).map((category) => categoryLabels[category]).filter(Boolean);
  const firstSteps = (result.verificationSteps || []).slice(0, 3);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
            <Target size={18} />
            Laudo curto
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {result.mainReason || "O conteúdo precisa de checagem antes de ser compartilhado."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            type="button"
            onClick={onCopy}
          >
            <Copy size={16} />
            Copiar
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-800"
            type="button"
            onClick={onDownload}
          >
            <Download size={16} />
            Baixar
          </button>
        </div>
      </div>

      {feedback ? <p className="mb-3 text-sm font-bold text-teal-700">{feedback}</p> : null}

      <div className="grid gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">Resumo</p>
          <p className="mt-1 text-sm leading-6 text-slate-800">{result.summary}</p>
        </div>

        {categories.length ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700" key={category}>
                {category}
              </span>
            ))}
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-bold text-slate-500">Próximos passos</p>
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {firstSteps.map((step) => (
              <li className="flex gap-2" key={step}>
                <CheckCircle2 className="mt-1 shrink-0 text-teal-700" size={16} />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <textarea className="sr-only" readOnly value={reportText} />
    </section>
  );
}

function SignalList({ title, icon: Icon, result }) {
  if (!result) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950">
          <Icon size={18} />
          {title}
        </h3>
        <RiskPill level={result.risk.level} />
      </div>
      <div className="space-y-3">
        {result.signals.slice(0, 3).map((signal) => (
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={signal.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">{signal.title}</h4>
              <RiskPill level={signal.severity} />
            </div>
            <p className="text-sm leading-6 text-slate-600">{signal.detail}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{signal.recommendation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState("texto");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoMeta, setPhotoMeta] = useState(null);
  const [photoDescription, setPhotoDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [analysisState, setAnalysisState] = useState({ local: null, ai: null, final: null, error: "" });
  const [aiStatus, setAiStatus] = useState({ loading: true, ok: false });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [reportFeedback, setReportFeedback] = useState("");
  const fileInputRef = useRef(null);

  const canAnalyze =
    mode === "texto" ? text.trim().length > 0 : mode === "link" ? linkUrl.trim().length > 0 : Boolean(photo);
  const currentMode = modeOptions.find((option) => option.id === mode) || modeOptions[0];
  const reportInput =
    mode === "texto"
      ? text
      : mode === "link"
        ? linkUrl
        : photoDescription || photo?.name || "Imagem enviada";
  const reportText = useMemo(
    () =>
      createReportText({
        result: analysisState.final,
        localResult: analysisState.local,
        aiResult: analysisState.ai,
        mode,
        input: reportInput,
      }),
    [analysisState.ai, analysisState.final, analysisState.local, mode, reportInput],
  );

  const statusLabel = useMemo(() => {
    if (aiStatus.loading) {
      return "Verificando conexão";
    }

    if (aiStatus.ok) {
      return "Verificação ativa";
    }

    if (aiStatus.needsApiKey) {
      return "Verificação pendente";
    }

    return "Verificação indisponível";
  }, [aiStatus]);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/ai-status");
        const data = await response.json();

        if (isMounted) {
          setAiStatus({ loading: false, ...data });
        }
      } catch (error) {
        if (isMounted) {
          setAiStatus({ loading: false, ok: false, error: error.message });
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAnalyze() {
    if (!canAnalyze) {
      return;
    }

    setReportFeedback("");
    const normalizedLinkUrl = mode === "link" ? parseUserUrl(linkUrl)?.toString() || linkUrl.trim() : "";
    const localResult =
      mode === "texto"
        ? analyzeText(text)
        : mode === "link"
          ? analyzeLink(normalizedLinkUrl)
          : analyzePhoto(photo, photoMeta, photoDescription);

    setIsAnalyzing(true);
    setAnalysisState({ local: localResult, ai: null, final: localResult, error: "" });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text,
          linkUrl: normalizedLinkUrl,
          photoDescription,
          imageDataUrl: mode === "foto" ? photoPreview : "",
          localResult,
        }),
      });
      const data = await response.json();

      if (!data.ok) {
        setAnalysisState({
          local: localResult,
          ai: null,
          final: localResult,
          error: data.error || "A verificação complementar não respondeu.",
        });
        return;
      }

      const aiResult = convertAiAnalysis(data.analysis);
      setAnalysisState({
        local: localResult,
        ai: aiResult,
        final: chooseFinalResult(localResult, aiResult),
        error: "",
      });
    } catch (error) {
      setAnalysisState({
        local: localResult,
        ai: null,
        final: localResult,
        error: error.message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleReset() {
    setText("");
    setPhoto(null);
    setPhotoPreview("");
    setPhotoMeta(null);
    setPhotoDescription("");
    setLinkUrl("");
    setAnalysisState({ local: null, ai: null, final: null, error: "" });
    setReportFeedback("");
  }

  async function handleCopyReport() {
    if (!reportText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(reportText);
      setReportFeedback("Relatório copiado.");
    } catch {
      setReportFeedback("Não foi possível copiar agora.");
    }
  }

  function handleDownloadReport() {
    if (!reportText) {
      return;
    }

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "confere-agora-relatorio.txt";
    link.click();
    URL.revokeObjectURL(url);
    setReportFeedback("Relatório baixado.");
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    setPhoto(file);
    setAnalysisState({ local: null, ai: null, final: null, error: "" });
    setReportFeedback("");

    try {
      const prepared = await prepareImageForCloud(file);
      setPhotoPreview(prepared.dataUrl);
      setPhotoMeta(prepared.meta);
    } catch (error) {
      setAnalysisState({
        local: null,
        ai: null,
        final: null,
        error: error.message,
      });
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setAnalysisState({ local: null, ai: null, final: null, error: "" });
    setReportFeedback("");
  }

  return (
    <main className="min-h-screen bg-[#f2f7f4] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-teal-100 bg-[#fbfdfc] px-4 py-4 shadow-soft sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-teal-100 bg-white shadow-soft">
                <img
                  alt="Confere Agora"
                  className="h-11 w-11 object-contain"
                  src="/logo-confere-agora.png"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Confere Agora</h1>
                <p className="text-sm font-medium text-slate-600">Leia com calma. Confira sinais. Compartilhe melhor.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-teal-100 bg-white px-3 text-xs font-bold text-slate-700">
                <StatusDot active={Boolean(aiStatus.ok)} />
                {statusLabel}
              </span>
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-800">
                <ShieldCheck size={14} />
                Checagem protegida
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {workflowItems.map(([step, label]) => (
              <div className="flex items-center gap-3 rounded-lg border border-teal-100 bg-white px-3 py-2" key={step}>
                <span className="text-xs font-bold text-teal-700">{step}</span>
                <span className="text-sm font-bold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </header>

        <section className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.7fr)]">
          <div className="rounded-lg border border-teal-100 bg-white p-4 shadow-soft sm:p-5">
            <div className="mb-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-teal-700">Entrada</p>
                  <h2 className="text-xl font-bold text-slate-950">{currentMode.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{currentMode.description}</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  <StatusDot active={canAnalyze} />
                  {canAnalyze ? "Pronto para checar" : "Aguardando entrada"}
                </span>
              </div>
              <ModeCards activeMode={mode} onChange={switchMode} />
            </div>

            {mode === "texto" ? (
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-800" htmlFor="content-text">
                    Conteúdo recebido
                  </label>
                  <span className="text-xs font-bold text-slate-500">{text.trim().length} caracteres</span>
                </div>
                <textarea
                  id="content-text"
                  className="min-h-72 rounded-lg border border-teal-100 bg-[#f8fbfa] px-4 py-3 text-base leading-7 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  placeholder="Cole a manchete, mensagem, legenda ou texto do post."
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setAnalysisState({ local: null, ai: null, final: null, error: "" });
                    setReportFeedback("");
                  }}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                    disabled={!canAnalyze || isAnalyzing}
                    onClick={handleAnalyze}
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <SearchCheck size={18} />}
                    {isAnalyzing ? "Analisando" : "Conferir agora"}
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="button"
                    onClick={() => {
                      setText(claimSample);
                      setAnalysisState({ local: null, ai: null, final: null, error: "" });
                      setReportFeedback("");
                    }}
                  >
                    <ShieldAlert size={17} />
                    Boato de saúde
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="button"
                    onClick={() => {
                      setText(sampleText);
                      setAnalysisState({ local: null, ai: null, final: null, error: "" });
                      setReportFeedback("");
                    }}
                  >
                    <FileText size={17} />
                    Dados sem método
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="button"
                    onClick={() => {
                      setText(manipulationSample);
                      setAnalysisState({ local: null, ai: null, final: null, error: "" });
                      setReportFeedback("");
                    }}
                  >
                    <AlertTriangle size={17} />
                    Pressão emocional
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="button"
                    onClick={handleReset}
                  >
                    <RotateCcw size={17} />
                    Limpar
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                    <ShieldAlert className="mb-2 text-rose-700" size={18} />
                    <p className="text-sm font-bold text-rose-900">Boato de saúde</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-rose-800">
                      Exemplo realista de promessa de cura milagrosa.
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                    <FileText className="mb-2 text-amber-700" size={18} />
                    <p className="text-sm font-bold text-amber-900">Dados sem método</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                      Números chamativos sem origem verificável.
                    </p>
                  </div>
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                    <AlertTriangle className="mb-2 text-indigo-700" size={18} />
                    <p className="text-sm font-bold text-indigo-950">Pressão emocional</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-indigo-900">
                      Linguagem de urgência para acelerar o compartilhamento.
                    </p>
                  </div>
                </div>
              </div>
            ) : mode === "link" ? (
              <div className="flex h-full flex-col gap-4">
                <div className="rounded-lg border border-teal-100 bg-[#f8fbfa] p-4">
                  <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="content-link">
                    Link para verificar
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-teal-700" size={18} />
                      <input
                        id="content-link"
                        className="min-h-12 w-full rounded-lg border border-teal-100 bg-white py-3 pl-10 pr-4 text-base outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        placeholder="https://exemplo.com/noticia"
                        type="url"
                        value={linkUrl}
                        onChange={(event) => {
                          setLinkUrl(event.target.value);
                          setAnalysisState({ local: null, ai: null, final: null, error: "" });
                          setReportFeedback("");
                        }}
                      />
                    </div>
                    <button
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-slate-300"
                      type="button"
                      disabled={!canAnalyze || isAnalyzing}
                      onClick={handleAnalyze}
                    >
                      {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <SearchCheck size={18} />}
                      {isAnalyzing ? "Analisando" : "Verificar link"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-teal-100 bg-white p-4">
                    <ShieldCheck className="mb-3 text-teal-700" size={20} />
                    <p className="text-sm font-bold text-slate-950">Origem</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                      Observa domínio, protocolo e destino final.
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-white p-4">
                    <FileText className="mb-3 text-amber-700" size={20} />
                    <p className="text-sm font-bold text-slate-950">Conteúdo</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                      Tenta ler título, descrição e trecho principal.
                    </p>
                  </div>
                  <div className="rounded-lg border border-rose-100 bg-white p-4">
                    <AlertTriangle className="mb-3 text-rose-700" size={20} />
                    <p className="text-sm font-bold text-slate-950">Cautela</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                      Aponta encurtadores, apelos e sinais de risco.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="button"
                    onClick={() => {
                      setLinkUrl("https://www.gov.br/saude/pt-br");
                      setAnalysisState({ local: null, ai: null, final: null, error: "" });
                      setReportFeedback("");
                    }}
                  >
                    <ShieldCheck size={17} />
                    Exemplo confiável
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="button"
                    onClick={() => {
                      setLinkUrl("http://bit.ly/promocao-urgente-cura-milagrosa");
                      setAnalysisState({ local: null, ai: null, final: null, error: "" });
                      setReportFeedback("");
                    }}
                  >
                    <AlertTriangle size={17} />
                    Exemplo de risco
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="button"
                    onClick={handleReset}
                  >
                    <RotateCcw size={17} />
                    Limpar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <input
                  ref={fileInputRef}
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />

                <button
                  className={`flex min-h-72 flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-4 text-center transition ${
                    isDragging
                      ? "border-teal-600 bg-teal-50"
                      : "border-slate-300 bg-slate-50 hover:border-teal-500 hover:bg-white"
                  }`}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                >
                  {photoPreview ? (
                    <img
                      alt="Prévia da foto enviada"
                      className="max-h-80 w-full rounded-md object-contain"
                      src={photoPreview}
                    />
                  ) : (
                    <>
                      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
                        <ImagePlus size={28} />
                      </span>
                      <span className="max-w-md text-sm font-bold text-slate-700">
                        Selecionar imagem, print ou card
                      </span>
                    </>
                  )}
                </button>

                {photoMeta ? (
                  <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
                    <span>{photoMeta.width} × {photoMeta.height}px</span>
                    <span>{Math.round(photoMeta.size / 1024)} KB</span>
                    <span>{photoMeta.type.replace("image/", "")}</span>
                  </div>
                ) : null}

                <label className="text-sm font-bold text-slate-800" htmlFor="image-description">
                  Texto visível na imagem
                </label>
                <textarea
                  id="image-description"
                  className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  placeholder="Transcreva frases importantes quando quiser reforçar a análise local."
                  value={photoDescription}
                  onChange={(event) => {
                    setPhotoDescription(event.target.value);
                    setAnalysisState({ local: null, ai: null, final: null, error: "" });
                    setReportFeedback("");
                  }}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                    disabled={!canAnalyze || isAnalyzing}
                    onClick={handleAnalyze}
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    {isAnalyzing ? "Analisando" : "Verificar foto"}
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="button"
                    onClick={handleReset}
                  >
                    <RotateCcw size={17} />
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            {analysisState.final ? (
              <>
                <ResultMeter result={analysisState.final} />
                <ReportCard
                  result={analysisState.final}
                  reportText={reportText}
                  feedback={reportFeedback}
                  onCopy={handleCopyReport}
                  onDownload={handleDownloadReport}
                />
                <EvidenceBadges result={analysisState.final} />
                <NewsAssessmentCard assessment={analysisState.final.isNewsLike} />
                <LinkMetadataCard metadata={analysisState.final.linkMetadata || analysisState.ai?.linkMetadata} />
                <ExtractedTextCard text={analysisState.final.extractedText || analysisState.ai?.extractedText} />

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                      <FileText size={15} />
                      Regras
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <RiskPill level={analysisState.local.risk.level} />
                      <span className="text-sm font-bold text-slate-900">{analysisState.local.risk.score}/100</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                      <BrainCircuit size={15} />
                      Verificação complementar
                    </p>
                    {analysisState.ai ? (
                      <div className="flex items-center justify-between gap-3">
                        <RiskPill level={analysisState.ai.risk.level} />
                        <span className="text-sm font-bold text-slate-900">{analysisState.ai.risk.score}/100</span>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-amber-700">Indisponível agora</p>
                    )}
                  </div>
                </section>

                {analysisState.error ? (
                  <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <div className="mb-1 flex items-center gap-2 font-bold">
                      <Info size={17} />
                      Verificação complementar indisponível
                    </div>
                    <p>{analysisState.error}</p>
                  </section>
                ) : null}

                {analysisState.ai?.limitations ? (
                  <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                    <div className="mb-1 flex items-center gap-2 font-bold text-slate-900">
                      <Info size={17} />
                      Limite da leitura
                    </div>
                    <p>{analysisState.ai.limitations}</p>
                  </section>
                ) : null}

                <SignalList title="Análise por regras" icon={FileText} result={analysisState.local} />
                <SignalList title="Verificação complementar" icon={BrainCircuit} result={analysisState.ai} />
              </>
            ) : (
              <EmptyState mode={mode} />
            )}

            {!aiStatus.loading && !aiStatus.ok ? (
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950">
                  <BrainCircuit size={18} />
                  Configurar verificação complementar
                </h3>
                <div className="space-y-2 text-sm leading-6 text-slate-700">
                  <p>Adicione a variável secreta no ambiente do deploy para liberar a verificação para todos.</p>
                  <code className="block rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white">
                    CLOUD_AI_API_KEY=sua_chave
                  </code>
                </div>
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

export default App;
