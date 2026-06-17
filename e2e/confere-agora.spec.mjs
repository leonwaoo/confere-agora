import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function mockApi(page) {
  await page.route("**/api/ai-status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/analyze", async (route) => {
    const rawBody = route.request().postData() || "{}";
    const payload = JSON.parse(rawBody);
    const linkMetadata =
      payload.mode === "link"
        ? {
            url: payload.linkUrl,
            finalUrl: payload.linkUrl,
            domain: "gov.br",
            siteName: "gov.br",
            title: "Ministerio da Saude",
            description: "Pagina publica usada nos testes end-to-end.",
            author: "Governo Federal",
            publishedDate: "2026-01-01",
            canonicalUrl: payload.linkUrl,
          }
        : null;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        analysis: {
          level: "alto",
          score: 92,
          confidence: "alta",
          summary:
            "Há risco alto: a mensagem faz uma promessa extrema sem fonte confiável e pressiona o compartilhamento.",
          mainReason: "Promessa absurda de cura rápida sem evidência confiável.",
          categories: payload.mode === "link" ? ["noticia_sem_fonte"] : ["saude", "corrente"],
          isNewsLike: {
            status: payload.mode === "link" ? "parece_noticia" : "nao_parece_noticia",
            detail:
              payload.mode === "link"
                ? "O link tem formato de página pública, mas ainda exige leitura crítica."
                : "A mensagem tem formato de corrente, não de notícia.",
          },
          plausibility: {
            status: payload.mode === "link" ? "plausivel" : "absurdo",
            detail:
              payload.mode === "link"
                ? "A estrutura do link parece plausível, mas o conteúdo ainda precisa de fonte e contexto."
                : "A promessa de cura em poucos dias é extrema e incompatível com evidência médica básica.",
          },
          extractedText: payload.mode === "foto" ? "Compartilhe antes que apaguem" : "",
          signals: [
            {
              title: "Promessa extrema sem evidência",
              severity: "alto",
              detail: "O conteúdo afirma algo forte sem apresentar fonte verificável.",
              recommendation: "Procure fonte oficial ou checagem independente.",
            },
            {
              title: "Pressão para compartilhar",
              severity: "alto",
              detail: "A mensagem incentiva repasse rápido antes da checagem.",
              recommendation: "Evite compartilhar sob pressão.",
            },
          ],
          verificationSteps: ["Conferir fonte original", "Verificar data e contexto", "Comparar com fonte confiável"],
          limitations: "Resposta mockada para teste end-to-end.",
          linkMetadata,
        },
      }),
    });
  });
}

async function runTextAnalysis(page) {
  await page.goto("/");
  await page.locator("#content-text").fill(
    "URGENTE! Agua quente com limao cura cancer em 3 dias. Compartilhe antes que apaguem.",
  );
  await page.getByRole("button", { name: /Conferir agora/i }).click();
  await expect(page.getByText(/Resultado confirmado/i)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("analisa texto e mostra laudo curto", async ({ page }) => {
  await runTextAnalysis(page);

  await expect(page.getByText(/Risco Alto/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Parece absurdo/i })).toBeVisible();
  await expect(page.getByText(/Laudo curto/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Copiar/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /PDF/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Imagem", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /TXT/i })).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /PDF/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("confere-agora-laudo.pdf");
});

test("analisa link e mostra confiabilidade da fonte", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Link/i }).click();
  await page.locator("#content-link").fill("https://www.gov.br/saude/pt-br");
  await page.getByRole("button", { name: /Verificar link/i }).click();

  await expect(page.getByText(/Resultado confirmado/i)).toBeVisible();
  await expect(page.getByText(/Dados lidos do link/i)).toBeVisible();
  await expect(page.getByText(/Confiabilidade da fonte/i)).toBeVisible();
});

test("aceita upload de foto e gera resultado", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Foto/i }).click();

  const imagePath = testInfo.outputPath("checagem.svg");
  await writeFile(
    imagePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
      <rect width="640" height="360" fill="#eef8f3"/>
      <text x="40" y="170" font-family="Arial" font-size="34" fill="#0f172a">Compartilhe antes que apaguem</text>
    </svg>`,
    "utf8",
  );

  await page.setInputFiles('input[type="file"]', imagePath);
  await expect(page.locator('img[src^="data:image"]')).toBeVisible();
  await page.locator("#image-description").fill("Compartilhe antes que apaguem");
  await page.getByRole("button", { name: /Verificar foto/i }).click();

  await expect(page.getByText(/Resultado confirmado/i)).toBeVisible();
  await expect(page.getByText(/Laudo curto/i)).toBeVisible();
});

test("nao mostra laudo quando verificacao complementar falha", async ({ page }) => {
  await page.unroute("**/api/analyze");
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "Mock E2E: verificacao complementar indisponivel.",
      }),
    });
  });

  await page.goto("/");
  await page.locator("#content-text").fill("Agua quente com limao cura cancer em 3 dias.");
  await page.getByRole("button", { name: /Conferir agora/i }).click();

  await expect(page.getByText(/Verificação não concluída/i)).toBeVisible();
  await expect(page.getByText(/Resultado confirmado/i)).toHaveCount(0);
  await expect(page.getByText(/Laudo curto/i)).toHaveCount(0);
});

test("abre pagina visual de relatorio", async ({ page }) => {
  await runTextAnalysis(page);
  await page.getByRole("button", { name: /Página/i }).click();

  await expect(page.getByText(/Laudo visual para compartilhar/i)).toBeVisible();
  await expect(page.getByText(/Laudo de checagem/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Imprimir/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /PDF/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Imagem/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /TXT/i })).toHaveCount(0);
});

test("mantem layout mobile sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const hasNoHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );

  expect(hasNoHorizontalOverflow).toBe(true);

  await page.locator("#content-text").fill(
    "URGENTE! Agua quente com limao cura cancer em 3 dias. Compartilhe antes que apaguem.",
  );
  await page.getByRole("button", { name: /Conferir agora/i }).click();
  await expect(page.getByText(/Resultado confirmado/i)).toBeVisible();

  const resultHasNoHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );

  expect(resultHasNoHorizontalOverflow).toBe(true);
});
