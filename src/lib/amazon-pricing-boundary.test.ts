import { describe, expect, it } from "vitest";
import { calculateAmazonPrice } from "./pricing";

describe("Amazon: custo exato abaixo de R$ 100 e margem configurada a partir de R$ 100", () => {
  it("preserva o custo exato abaixo de R$ 100", () => {
    expect(calculateAmazonPrice(99.99)).toBe(99.99);
    expect(calculateAmazonPrice(59.99)).toBe(59.99);
  });

  it("mantém a margem configurada inclusive no limite de R$ 100", () => {
    expect(calculateAmazonPrice(100)).toBe(159.9);
    expect(calculateAmazonPrice(100.01)).toBe(125.9);
    expect(calculateAmazonPrice(200)).toBe(249.9);
  });
});