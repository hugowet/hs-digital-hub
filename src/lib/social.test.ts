import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSocialPhone, isActiveStory, STORY_DURATION_MS } from "./social";
test("conexão encontra o mesmo número cadastrado com DDD ou código do Brasil", () => {
  assert.equal(normalizeSocialPhone("(11) 91234-5678"), "5511912345678");
  assert.equal(normalizeSocialPhone("+55 11 91234-5678"), "5511912345678");
  assert.equal(normalizeSocialPhone("1234"), null);
});
test("stories ficam visíveis por 24 horas e deixam de aparecer no limite", () => {
  const created = Date.parse("2026-10-23T21:49:00Z");
  assert.equal(STORY_DURATION_MS, 86400000);
  const expires = new Date(created + STORY_DURATION_MS).toISOString();
  assert.equal(isActiveStory(expires, created + 86399999), true);
  assert.equal(isActiveStory(expires, created + 86400000), false);
});