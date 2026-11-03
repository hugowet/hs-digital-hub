import { describe, it, expect } from "vitest";
import { buyerChoiceGroups, choiceLabel, isValidChoiceLabel, choiceImage } from "./product-choices";

const helmet = [{ name: "Cor", options: ["Preto", "Branco", "Rosa"], selected: "Preto" }, { name: "Tamanho", options: ["56", "58", "60"] }];

describe("buyer choices", () => {
  it("changes helmet photo to the explicitly mapped white, black and pink options", () => {
    const images = { Branco: "https://m.media-amazon.com/images/I/white.jpg", Preto: "https://m.media-amazon.com/images/I/black.jpg", Rosa: "https://m.media-amazon.com/images/I/pink.jpg" };
    const groups = buyerChoiceGroups([{ ...helmet[0], images }, helmet[1]]);
    expect(choiceImage(groups, { Cor: "Branco", Tamanho: "58" })).toBe(images.Branco);
    expect(choiceImage(groups, { Cor: "Preto", Tamanho: "60" })).toBe(images.Preto);
    expect(choiceImage(groups, { Cor: "Rosa" })).toBe(images.Rosa);
    expect(choiceImage(groups, { Cor: "Azul" })).toBeNull();
    expect(choiceImage(buyerChoiceGroups(helmet), { Cor: "Branco" })).toBeNull();
  });
  it("requires a color and a size before buying", () => {
    expect(choiceLabel(buyerChoiceGroups(helmet), { Cor: "Branco" })).toBeNull();
    expect(choiceLabel(buyerChoiceGroups(helmet), { Cor: "Branco", Tamanho: "60" })).toBe("Cor: Branco · Tamanho: 60");
  });
  it("rejects options that do not exist on the product", () => {
    expect(isValidChoiceLabel(helmet, "Cor: Azul · Tamanho: 58")).toBe(false);
    expect(isValidChoiceLabel(helmet, "Cor: Rosa · Tamanho: 56")).toBe(true);
  });
});
