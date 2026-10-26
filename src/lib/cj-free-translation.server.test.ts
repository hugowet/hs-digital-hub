import { test } from "node:test";
import assert from "node:assert/strict";
import { translateCjFreeText, FreeTranslationDeferred } from "./cj-free-translation.server";

function memoryDb(allow = true) {
  const cache = new Map<string, string>();
  return {
    cache,
    rpc: async (name: string, args: { _bytes: number }) => {
      assert.equal(name, "reserve_cj_identified_free_translation");
      assert.ok(args._bytes > 0 && args._bytes <= 500);
      return { data: allow, error: null };
    },
    from: () => ({
      select: () => ({ eq: (_column: string, id: string) => ({ maybeSingle: async () => ({ data: cache.has(id) ? { translated_text: cache.get(id) } : null, error: null }) }) }),
      upsert: async (row: { id: string; translated_text: string }) => { cache.set(row.id, row.translated_text); return { error: null }; },
    }),
  };
}

test("free catalog translation caches text and never calls a paid endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.mymemory.translated.net");
    assert.equal(url.searchParams.get("langpair"), "en|pt-br");
    assert.equal(url.searchParams.get("de"), "hugoet373@gmail.com");
    calls += 1;
    return Response.json({ responseStatus: 200, responseData: { translatedText: "Sapatos pretos tamanho 38" } });
  }) as typeof fetch;
  try {
    const db = memoryDb();
    assert.equal(await translateCjFreeText(db, "Black shoes size 38"), "Sapatos pretos tamanho 38");
    assert.equal(await translateCjFreeText(db, "Black shoes size 38"), "Sapatos pretos tamanho 38");
    assert.equal(calls, 1);
    assert.equal(db.cache.size, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test("long product sheets use the identified allowance and preserve cache on resumption", async () => {
  const originalFetch = globalThis.fetch;
  const source = "Wireless headphones with rechargeable battery. ".repeat(40);
  let calls = 0;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("de"), "hugoet373@gmail.com");
    assert.ok(new TextEncoder().encode(url.searchParams.get("q") ?? "").length <= 450);
    calls += 1;
    return Response.json({ responseStatus: 200, responseData: { translatedText: "Fones de ouvido sem fio com bateria recarregável." } });
  }) as typeof fetch;
  try {
    const db = memoryDb();
    const first = await translateCjFreeText(db, source);
    assert.ok(calls > 1);
    const initialCalls = calls;
    assert.equal(await translateCjFreeText(db, source), first);
    assert.equal(calls, initialCalls);
  } finally { globalThis.fetch = originalFetch; }
});

test("provider quota defers identified requests without saving an error or using paid AI", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return Response.json({ quotaFinished: true, responseStatus: 403 });
  }) as typeof fetch;
  try {
    const db = memoryDb();
    await assert.rejects(translateCjFreeText(db, "Portable speaker"), FreeTranslationDeferred);
    assert.equal(calls, 1);
    assert.equal(db.cache.size, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("exhausted local budget stops without a paid fallback", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; throw new Error("Unexpected network request"); }) as typeof fetch;
  try {
    await assert.rejects(translateCjFreeText(memoryDb(false), "Black shoes"), FreeTranslationDeferred);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});