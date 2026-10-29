import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./amazon.functions", () => ({ extractDescription: vi.fn(), extractSpecs: vi.fn() }));
import { isTrustworthyTrend, isCoherentPrice, searchCategoryWinners, runAmazonAutoImport } from "./amazon-auto.server";
import { describeAmazonSearchError } from "./amazon-search-diagnostics";

const base = { url: "https://www.amazon.com.br/dp/B0ABC12345", title: "Fone bluetooth", badge: "", fulfilledByAmazon: false };

describe("filtro anti-golpe do robô Amazon", () => {
  it("rejeita nota baixa mesmo com muitas avaliações", () => {
    expect(isTrustworthyTrend({ ...base, rating: 4.0, reviews: 5000 })).toBe(false);
  });

  it("rejeita poucas avaliações mesmo com nota alta", () => {
    expect(isTrustworthyTrend({ ...base, rating: 4.9, reviews: 30 })).toBe(false);
  });

  it("aceita nota 4.5+ com 500+ avaliações", () => {
    expect(isTrustworthyTrend({ ...base, rating: 4.6, reviews: 800 })).toBe(true);
  });

  it("aceita selo oficial com 100+ avaliações e nota 4.3+", () => {
    expect(isTrustworthyTrend({ ...base, rating: 4.4, reviews: 150, badge: "Escolha da Amazon" })).toBe(true);
  });

  it("aceita envio pela Amazon com 200+ avaliações", () => {
    expect(isTrustworthyTrend({ ...base, rating: 4.3, reviews: 250, fulfilledByAmazon: true })).toBe(true);
  });

  it("rejeita produto sem link ou título", () => {
    expect(isTrustworthyTrend({ ...base, url: "", rating: 4.9, reviews: 9000 })).toBe(false);
  });
});

describe("coerência de preço", () => {
  it("rejeita preço baixo demais (possível golpe)", () => {
    expect(isCoherentPrice(4.99)).toBe(false);
  });

  it("rejeita preço fora da faixa máxima", () => {
    expect(isCoherentPrice(9000)).toBe(false);
  });

  it("aceita preço coerente", () => {
    expect(isCoherentPrice(199.9)).toBe(true);
  });
});

describe("diagnósticos por página Amazon", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  function setup() {
    vi.stubEnv("LOVABLE_API_KEY", "test-only");
    vi.stubEnv("FIRECRAWL_API_KEY", "test-only");
  }
  const response = (products: unknown[]) => Response.json({ data: { json: { products } } });

  it("guarda HTTP 503 de cada página sem alegar bloqueio confirmado", async () => {
    setup();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("upstream body must not persist", { status: 503 }))));
    const result = await searchCategoryWinners("celular", 48);
    expect(result.failed).toBe(true);
    expect(result.diagnostics.map(d => [d.page, d.httpStatus, d.code])).toEqual([[1, 503, "reader_http_error"], [2, 503, "reader_http_error"], [3, 503, "reader_http_error"]]);
    expect(JSON.stringify(result)).not.toContain("upstream body");
  });

  it("mantém candidatos de páginas legíveis quando outra falha", async () => {
    setup();
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 429 })).mockResolvedValueOnce(response([{ ...base, rating: 4.6, reviews: 800 }])).mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetch);
    const result = await searchCategoryWinners("fone", 48);
    expect(result.failed).toBe(false);
    expect(result.winners).toHaveLength(1);
    expect(result.diagnostics.map(d => d.outcome)).toEqual(["failed", "ok", "empty"]);
    expect(result.diagnostics[0].httpStatus).toBe(429);
  });

  it("distingue resposta inválida de lista vazia", async () => {
    setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ data: {} })).mockResolvedValueOnce(response([])).mockResolvedValueOnce(new Response("invalid")));
    const result = await searchCategoryWinners("relógio", 48);
    expect(result.diagnostics.map(d => d.code)).toEqual(["missing_products_array", "empty_extraction", "invalid_json"]);
  });

  it("registra rejeição por nota, avaliações, reputação e link, além de repetidos", async () => {
    setup();
    const valid = { ...base, rating: 4.6, reviews: 800 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response([
      { ...valid, url: "invalid" }, { ...valid, rating: 4.2 },
      { ...valid, reviews: 99 }, { ...valid, rating: 4.4, reviews: 150 }, valid, valid,
    ])).mockResolvedValue(response([])));
    const result = await searchCategoryWinners("fone", 48);
    expect(result.diagnostics[0].rejections).toEqual({ invalid_product_link: 1, rating_below_4_3: 1, reviews_below_100: 1, insufficient_trust_signals: 1 });
    expect(result.diagnostics[0].duplicates).toBe(1);
    expect(result.diagnostics[0].accepted).toBe(1);
  });

  it("preserva seis motivos de falha no resultado da rodada sem publicar", async () => {
    setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const db = { from: vi.fn(() => ({ select: () => ({ eq: () => ({ limit }) }) })) };
    const result = await runAmazonAutoImport(db, "test-store");
    expect(result.searchFailures).toBe(2);
    expect(result.searchDiagnostics).toHaveLength(6);
    expect(result.searchDiagnostics.every(d => d.httpStatus === 403)).toBe(true);
    expect(result.published).toBe(0);
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("não guarda mensagens arbitrárias potencialmente secretas", () => {
    expect(JSON.stringify(describeAmazonSearchError(new Error("private credential")))).not.toContain("private credential");
    expect(describeAmazonSearchError(new DOMException("private", "TimeoutError")).code).toBe("timeout");
  });

  it('persists search candidates without fetching details in the same callback', async () => {
    setup();
    const fetch = vi.fn().mockResolvedValue(response([{ ...base, rating: 4.6, reviews: 800 }]));
    vi.stubGlobal('fetch', fetch);
    const db = { from: vi.fn(() => ({ select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) })) };
    const result = await runAmazonAutoImport(db, 'test-store', 0, { pending: [], nextAllowedAt: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.queue).toHaveLength(1);
    expect(result.published).toBe(0);
    expect(result.nextAllowedAt).toBeGreaterThan(Date.now());
  });

  it('preserves pending products and aborts immediately on CAPTCHA', async () => {
    setup();
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: { rawHtml: '<input id="captchacharacters">' } }));
    vi.stubGlobal('fetch', fetch);
    const db = { from: vi.fn(() => ({ select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) })) };
    const pending = [{ ...base, rating: 4.6, reviews: 800 }, { ...base, url: 'https://www.amazon.com.br/dp/B0ABC12346', rating: 4.6, reviews: 800 }];
    const result = await runAmazonAutoImport(db, 'test-store', 0, { pending, nextAllowedAt: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.stopped?.code).toBe('amazon_captcha');
    expect(result.queue).toEqual(pending);
    expect(result.published).toBe(0);
  });

  it('makes no request before the saved delay expires', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const db = { from: vi.fn() };
    const result = await runAmazonAutoImport(db, 'test-store', 0, { pending: [], nextAllowedAt: Date.now() + 12000 });
    expect(fetch).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
    expect(result.nextAllowedAt).toBeGreaterThan(Date.now());
  });
});
