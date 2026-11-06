import { describe, it, expect } from "vitest";
import { manualProductOptions, manualOptionsSchema, productShippingOrigin } from "./manual-product-options";
import { buyerChoiceGroups, choiceLabel, isValidChoiceLabel } from "./product-choices";
describe("manual product options", () => {
  it("preserves American sizes without guessed Brazilian conversions", () => {
    const groups = manualProductOptions(["Branco", "Preto"], ["S", "XL", "10.5"], "US");
    expect(groups[1]).toEqual({ name: "Tamanho (US)", options: ["S", "XL", "10.5"] });
  });
  it("requires both the chosen color and size for the cart", () => {
    const groups = manualProductOptions(["Branco", "Preto"], ["S", "XL"], "US");
    expect(choiceLabel(buyerChoiceGroups(groups), { Cor: "Branco" })).toBeNull();
    expect(isValidChoiceLabel(groups, "Cor: Branco · Tamanho (US): XL")).toBe(true);
    expect(isValidChoiceLabel(groups, "Cor: Rosa · Tamanho (US): XL")).toBe(false);
  });
  it("uses the seller's shipping origin independently of supplier", () => {
    expect(productShippingOrigin({ shipping_origin: "international", supplier: null })).toBe("international");
    expect(productShippingOrigin({ shipping_origin: "national", supplier: null })).toBe("national");
  });
  it("rejects malformed choice labels and duplicate groups", () => {
    expect(manualOptionsSchema.safeParse([{ name: "Cor", options: ["Branco · Azul"] }]).success).toBe(false);
    expect(manualOptionsSchema.safeParse([{ name: "Cor", options: ["Branco"] }, { name: "Cor", options: ["Preto"] }]).success).toBe(false);
  });
});