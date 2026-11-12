import { describe, expect, it, vi } from "vitest";
vi.mock("linkedom", () => ({ parseHTML: () => ({ document: {} }) }));
import { amazonStockAfterRead, assertAmazonOrderCosts } from "./amazon-stock.server";

describe("estoque Amazon após leitura", () => {
  it("zera só quando a Amazon diz indisponível", () => {
    expect(amazonStockAfterRead("unavailable", 999)).toBe(0);
  });
  it("leitura sem resposta clara mantém o estoque salvo", () => {
    expect(amazonStockAfterRead("unknown", 999)).toBe(999);
  });
  it("em estoque permite comprar várias unidades", () => {
    expect(amazonStockAfterRead("available", 0)).toBe(999);
    expect(amazonStockAfterRead("available", 5)).toBe(5);
  });
});

describe("preço Amazon já aceito no pedido", () => {
  it("permite pagamento de R$30,95 mesmo com catálogo atualizado para R$53,90", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = { from: vi.fn((table: string) => table === "order_items"
      ? { select: () => ({ eq: () => ({ eq: async () => ({ data: [{ product_id: "fone", unit_price: 30.95 }], error: null }) }) }) }
      : { select: () => ({ eq: () => ({ in: async () => ({ data: [{ id: "fone", price: 53.9, supplier_cost: 38.9 }], error: null }) }) }) }) };
    try {
      await expect(assertAmazonOrderCosts(db, "order", "store")).resolves.toBeUndefined();
      expect(warning).toHaveBeenCalledWith("amazon_order_catalog_price_changed", expect.objectContaining({ acceptedPrice: 30.95, catalogPrice: 53.9 }));
    } finally { warning.mockRestore(); }
  });
  it("não ignora falhas na leitura do pedido", async () => {
    const db = { from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: null, error: new Error("Leitura negada") }) }) }) }) };
    await expect(assertAmazonOrderCosts(db, "order", "store")).rejects.toThrow("Leitura negada");
  });
});
