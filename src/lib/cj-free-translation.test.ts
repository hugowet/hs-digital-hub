import { test } from "node:test";
import assert from "node:assert/strict";
import { readFreeTranslation, splitTranslationText } from "./cj-free-translation";

test("free translator splits UTF-8 within provider's 500-byte ceiling without losing source", () => {
  const source = "Calçado azul tamanho 38 — algodão. ".repeat(60);
  const chunks = splitTranslationText(source);
  assert.equal(chunks.join(""), source);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => new TextEncoder().encode(chunk).length <= 500));
});
test("quota response is never saved as a translation", () => {
  assert.throws(() => readFreeTranslation({ responseStatus: 200, quotaFinished: true, responseData: { translatedText: "quota exceeded" } }));
});
test("accepts a successful Portuguese translation", () => {
  assert.equal(readFreeTranslation({ responseStatus: 200, responseData: { translatedText: "Calçado azul" } }), "Calçado azul");
});