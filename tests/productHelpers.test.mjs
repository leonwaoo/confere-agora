import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildEducationTips,
  calculateSourceReliability,
  getReferenceLinksForCategories,
} from "../src/productHelpers.js";

test("source reliability rewards identified HTTPS news metadata", () => {
  const reliability = calculateSourceReliability(
    {
      domain: "example.com",
      title: "Titulo da materia",
      author: "Redacao",
      publishedDate: "2026-06-16",
    },
    "https://example.com/noticia",
  );

  assert.equal(reliability.level, "forte");
  assert.equal(reliability.score, 100);
});

test("source reliability flags missing metadata", () => {
  const reliability = calculateSourceReliability({}, "http://bit.ly/urgente");

  assert.equal(reliability.level, "fraca");
  assert.ok(reliability.score < 50);
});

test("references are selected from risk categories without duplicates", () => {
  const links = getReferenceLinksForCategories(["saude", "saude", "golpe"]);
  const urls = links.map((link) => link.url);

  assert.ok(links.some((link) => link.label === "Ministério da Saúde"));
  assert.ok(links.some((link) => link.label === "Banco Central"));
  assert.equal(new Set(urls).size, urls.length);
});

test("education tips explain risky sharing patterns", () => {
  const tips = buildEducationTips({
    categories: ["corrente", "noticia_sem_fonte"],
    signals: [{ id: "urgent-share" }],
  });

  assert.ok(tips.some((tip) => tip.includes("repasse rápido")));
  assert.ok(tips.some((tip) => tip.includes("fonte clara")));
});
