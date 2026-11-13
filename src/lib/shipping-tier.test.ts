import { describe, expect, it } from "vitest";
import { shippingTier, shippingTierTotal } from "./shipping-tier";

describe("frete escalonado HS", () => {
  it("até R$39,90 cobra exatamente R$9,90", () => {
    expect(shippingTier(0.01, false)).toBe(9.9);
    expect(shippingTier(39.9, false)).toBe(9.9);
  });
  it("R$39,91 a R$89,89 cobra exatamente R$17,90", () => {
    expect(shippingTier(39.91, false)).toBe(17.9);
    expect(shippingTier(89.89, false)).toBe(17.9);
  });
  it("R$89,90 ou mais tem frete zero", () => {
    expect(shippingTier(89.9, false)).toBe(0);
    expect(shippingTier(200, false)).toBe(0);
  });
  it("administrador e Clube têm frete zero em qualquer faixa", () => {
    expect(shippingTier(10, true)).toBe(0);
    expect(shippingTier(60, true)).toBe(0);
    expect(shippingTier(100, true)).toBe(0);
  });
  it("total soma uma vez a faixa sem margem adicional", () => {
    expect(shippingTierTotal(39.9, false)).toBe(49.8);
    expect(shippingTierTotal(39.91, false)).toBe(57.81);
    expect(shippingTierTotal(89.9, false)).toBe(89.9);
    expect(shippingTierTotal(30.95, true)).toBe(30.95);
  });
  it("garantia não muda faixa baseada somente nos produtos", () => {
    expect(shippingTierTotal(89.89, false, 7)).toBe(114.79);
  });
});