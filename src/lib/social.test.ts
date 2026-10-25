import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSocialPhone, isActiveStory, STORY_DURATION_MS, isSocialOnline, isSocialTyping } from "./social";
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
test("presença exige atividade recente real e expira em 45 segundos", () => {
  const now = Date.parse("2026-10-25T00:21:00Z");
  assert.equal(isSocialOnline(new Date(now - 1000).toISOString(), now), true);
  assert.equal(isSocialOnline(new Date(now - 45000).toISOString(), now), false);
  assert.equal(isSocialOnline(undefined, now), false);
});
test("digitação aparece só na mesma conversa e expira sem nova atividade", () => {
  const now = Date.parse("2026-10-25T00:21:00Z");
  const presence = { last_seen_at: new Date(now).toISOString(), typing_at: new Date(now - 1000).toISOString(), typing_conversation_id: "room-a" };
  assert.equal(isSocialTyping(presence, "room-a", now), true);
  assert.equal(isSocialTyping(presence, "room-b", now), false);
  assert.equal(isSocialTyping(presence, "room-a", now + 6000), false);
});