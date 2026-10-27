import { describe, expect, it } from "vitest";
import { isTrustworthyTrend, isCoherentPrice } from "./amazon-auto.server";

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
