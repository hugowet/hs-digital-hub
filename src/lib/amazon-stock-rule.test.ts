import { describe, expect, it, vi } from "vitest";
vi.mock("linkedom", () => ({ parseHTML: () => ({ document: {} }) }));
import { amazonStockAfterRead } from "./amazon-stock.server";

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
