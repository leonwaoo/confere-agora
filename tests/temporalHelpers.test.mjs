import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyPublishedDate } from "../api/_gemini.js";

const referenceNow = new Date("2026-06-17T15:00:00-03:00");

test("published date from the same Brazil day is not future", () => {
  const status = classifyPublishedDate("2026-06-17T22:30:00-03:00", referenceNow);

  assert.equal(status.status, "hoje");
  assert.equal(status.today, "2026-06-17");
});

test("UTC timestamp is compared by Brazil calendar day", () => {
  const status = classifyPublishedDate("2026-06-18T01:30:00Z", referenceNow);

  assert.equal(status.status, "hoje");
  assert.equal(status.publishedDate, "2026-06-17");
});

test("published date after Brazil today is future", () => {
  const status = classifyPublishedDate("2026-06-18", referenceNow);

  assert.equal(status.status, "futuro");
  assert.equal(status.diffDays, 1);
});
