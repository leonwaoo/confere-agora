export const categoryLabels = {
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

export const referenceLinks = {
  saude: [
    { label: "Ministério da Saúde", url: "https://www.gov.br/saude/pt-br" },
    { label: "INCA", url: "https://www.gov.br/inca/pt-br" },
    { label: "Anvisa", url: "https://www.gov.br/anvisa/pt-br" },
  ],
  politica: [
    { label: "TSE", url: "https://www.tse.jus.br/" },
    { label: "Câmara dos Deputados", url: "https://www.camara.leg.br/" },
    { label: "Senado Federal", url: "https://www12.senado.leg.br/" },
  ],
  golpe: [
    { label: "Banco Central", url: "https://www.bcb.gov.br/" },
    { label: "gov.br", url: "https://www.gov.br/" },
    { label: "Consumidor.gov.br", url: "https://www.consumidor.gov.br/" },
  ],
  corrente: [
    { label: "Agência Lupa", url: "https://lupa.uol.com.br/" },
    { label: "Aos Fatos", url: "https://www.aosfatos.org/" },
    { label: "Comprova", url: "https://projetocomprova.com.br/" },
  ],
  noticia_sem_fonte: [
    { label: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/" },
    { label: "Reuters Brasil", url: "https://www.reuters.com/world/americas/" },
    { label: "BBC News Brasil", url: "https://www.bbc.com/portuguese" },
  ],
  acusacao_grave: [
    { label: "Jusbrasil", url: "https://www.jusbrasil.com.br/" },
    { label: "CNJ", url: "https://www.cnj.jus.br/" },
    { label: "Portal da Transparência", url: "https://portaldatransparencia.gov.br/" },
  ],
  imagem_fora_de_contexto: [
    { label: "Google Imagens", url: "https://images.google.com/" },
    { label: "TinEye", url: "https://tineye.com/" },
    { label: "InVID", url: "https://www.invid-project.eu/tools-and-services/invid-verification-plugin/" },
  ],
  link_suspeito: [
    { label: "Registro.br", url: "https://registro.br/tecnologia/ferramentas/whois/" },
    { label: "Google Safe Browsing", url: "https://transparencyreport.google.com/safe-browsing/search" },
    { label: "VirusTotal", url: "https://www.virustotal.com/" },
  ],
};

export function uniqueByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.url || seen.has(item.url)) {
      return false;
    }

    seen.add(item.url);
    return true;
  });
}

export function getReferenceLinksForCategories(categories = []) {
  const links = categories.flatMap((category) => referenceLinks[category] || []);
  return uniqueByUrl(links).slice(0, 6);
}

export function calculateSourceReliability(metadata, linkUrl = "") {
  const checks = [];
  let parsedUrl = null;

  try {
    parsedUrl = new URL(linkUrl || metadata?.finalUrl || metadata?.url || "");
  } catch {
    parsedUrl = null;
  }

  checks.push({
    label: "Conexão segura",
    passed: parsedUrl?.protocol === "https:",
    detail: "Prefira páginas com HTTPS.",
  });
  checks.push({
    label: "Domínio identificado",
    passed: Boolean(metadata?.domain || parsedUrl?.hostname),
    detail: "O domínio ajuda a avaliar a origem.",
  });
  checks.push({
    label: "Título lido",
    passed: Boolean(metadata?.title),
    detail: "Título ajuda a comparar a chamada com o conteúdo.",
  });
  checks.push({
    label: "Autor informado",
    passed: Boolean(metadata?.author),
    detail: "Autoria facilita responsabilização e checagem.",
  });
  checks.push({
    label: "Data encontrada",
    passed: Boolean(metadata?.publishedDate),
    detail: "Data ajuda a evitar conteúdo antigo fora de contexto.",
  });

  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    score,
    level: score >= 80 ? "forte" : score >= 50 ? "parcial" : "fraca",
    checks,
  };
}

export function buildEducationTips(result) {
  if (!result) {
    return [];
  }

  const categories = result.categories || [];
  const signalIds = (result.signals || []).map((signal) => signal.id).join(" ");
  const tips = [];

  if (categories.includes("noticia_sem_fonte") || /missing-source|numbers-without-context/.test(signalIds)) {
    tips.push("Conteúdo sem fonte clara dificulta saber quem publicou, quando publicou e de onde saiu a evidência.");
  }

  if (categories.includes("corrente") || /urgent-share|alarmist-language/.test(signalIds)) {
    tips.push("Pedidos de repasse rápido tentam reduzir o tempo de checagem e aumentar compartilhamentos impulsivos.");
  }

  if (categories.includes("saude")) {
    tips.push("Promessas de cura ou tratamento exigem confirmação em órgãos oficiais e profissionais qualificados.");
  }

  if (categories.includes("golpe")) {
    tips.push("Golpes costumam usar urgência, brindes, PIX, senhas ou dados pessoais para induzir uma ação rápida.");
  }

  if (categories.includes("imagem_fora_de_contexto")) {
    tips.push("Prints e cards podem esconder data, origem e contexto; busca reversa ajuda a encontrar a publicação original.");
  }

  if (categories.includes("politica") || categories.includes("acusacao_grave")) {
    tips.push("Acusações públicas sem documento, processo, reportagem confiável ou fonte oficial podem causar dano real.");
  }

  return tips.length
    ? tips.slice(0, 3)
    : ["Mesmo com risco baixo, confira fonte, data e contexto antes de repassar."];
}
