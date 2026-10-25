import { test } from "node:test";
import assert from "node:assert/strict";
import { translateCjFreeText, FreeTranslationDeferred } from "./cj-free-translation.server";

function memoryDb(allow = true) {
  const cache = new Map<string, string>();
  return {
    cache,
    rpc: async () => ({ data: allow, error: null }),
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

test("exhausted local budget stops without a paid fallback", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; throw new Error("Unexpected network request"); }) as typeof fetch;
  try {
    await assert.rejects(translateCjFreeText(memoryDb(false), "Black shoes"), FreeTranslationDeferred);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});