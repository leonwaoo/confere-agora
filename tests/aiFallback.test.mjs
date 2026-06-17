import assert from "node:assert/strict";
import { test } from "node:test";

import { getModelCandidates, shouldTryNextModel } from "../api/_gemini.js";

test("model candidates keep configured model first and add stable fallbacks", () => {
  const candidates = getModelCandidates({ model: "gemini-3.5-flash" });

  assert.equal(candidates[0], "gemini-3.5-flash");
  assert.ok(candidates.includes("gemini-3.1-flash-lite"));
  assert.ok(candidates.includes("gemini-2.5-flash-lite"));
  assert.equal(new Set(candidates).size, candidates.length);
});

test("temporary provider errors try the next model", () => {
  assert.equal(
    shouldTryNextModel({
      status: 503,
      message: "This model is currently experiencing high demand.",
    }),
    true,
  );
  assert.equal(shouldTryNextModel({ status: 500, message: "Temporary service error" }), true);
});

test("credential and quota errors do not fan out across models", () => {
  assert.equal(shouldTryNextModel({ status: 403, message: "API key not valid" }), false);
  assert.equal(shouldTryNextModel({ status: 429, message: "Quota exceeded" }), false);
});
