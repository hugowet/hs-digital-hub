import { describe, it, expect } from "vitest";
import { buyerChoiceGroups, choiceLabel, isValidChoiceLabel } from "./product-choices";

const helmet = [{ name: "Cor", options: ["Preto", "Branco", "Rosa"], selected: "Preto" }, { name: "Tamanho", options: ["56", "58", "60"] }];

describe("buyer choices", () => {
  it("requires a color and a size before buying", () => {
    expect(choiceLabel(buyerChoiceGroups(helmet), { Cor: "Branco" })).toBeNull();
    expect(choiceLabel(buyerChoiceGroups(helmet), { Cor: "Branco", Tamanho: "60" })).toBe("Cor: Branco · Tamanho: 60");
  });
  it("rejects options that do not exist on the product", () => {
    expect(isValidChoiceLabel(helmet, "Cor: Azul · Tamanho: 58")).toBe(false);
    expect(isValidChoiceLabel(helmet, "Cor: Rosa · Tamanho: 56")).toBe(true);
  });
});
