import { describe, expect, it, vi } from "vitest";
import type { Product } from "./catalog";
vi.mock("@/lib/catalog.functions", () => ({ fetchCatalogPage: vi.fn() }));
import { FEATURED_SHIRT_ID, selectAmazonBestSellers } from "./amazon-best-sellers";

const product = (id: string, sold_count: number, supplier = "amazon", stock = 1) => ({ id, sold_count, supplier, stock }) as Product;

describe("primeira fileira Mais vendidos", () => {
  it("mostra só Amazon com estoque", () => {
    expect(selectAmazonBestSellers([product("amazon", 2), product("cj", 100, "cj"), product("esgotado", 20, "amazon", 0)], []).map((p) => p.id)).toEqual(["amazon"]);
  });
  it("ordena pelos números registrados de vendas", () => {
    expect(selectAmazonBestSellers([product("menos", 2), product("mais", 10), product("sem-venda", 0)], []).map((p) => p.id)).toEqual(["mais", "menos", "sem-venda"]);
  });
  it("destaca a camisa solicitada sem duplicar nem inventar vendas", () => {
    const shirt = product(FEATURED_SHIRT_ID, 0);
    const selected = selectAmazonBestSellers([product("vendido", 10), shirt], [shirt]);
    expect(selected.map((p) => p.id)).toEqual([FEATURED_SHIRT_ID, "vendido"]);
    expect(selected[0]?.sold_count).toBe(0);
  });
});