import assert from "node:assert/strict";
import { test } from "node:test";

import { summarizeHtml } from "../api/_gemini.js";

test("link summary prefers structured article body over navigation text", () => {
  const html = `
    <html>
      <head>
        <title>Titulo da pagina</title>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "ReportageNewsArticle",
            "headline": "Eduardo Bolsonaro diz nao reconhecer condenacao do STF",
            "description": "STF condenou o ex-deputado.",
            "author": { "name": "PODER360" },
            "datePublished": "2026-06-16T20:42:30-03:00",
            "articleBody": "Eduardo Bolsonaro afirmou que nao reconhece a decisao da 1a Turma do Supremo Tribunal Federal."
          }
        </script>
      </head>
      <body>
        <nav>Futuro Indicativo - Opiniao</nav>
        <article>
          <h1>Eduardo Bolsonaro diz nao reconhecer condenacao do STF</h1>
          <p>Texto visivel da materia.</p>
        </article>
      </body>
    </html>
  `;

  const summary = summarizeHtml(html, "https://www.poder360.com.br/noticia");

  assert.equal(summary.title, "Eduardo Bolsonaro diz nao reconhecer condenacao do STF");
  assert.equal(summary.author, "PODER360");
  assert.equal(summary.publishedDateStatus.status, "passado");
  assert.ok(summary.excerpt.startsWith("Eduardo Bolsonaro afirmou"));
  assert.equal(summary.excerpt.includes("Futuro Indicativo"), false);
});
