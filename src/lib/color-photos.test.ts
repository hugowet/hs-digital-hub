import { expect, it } from "vitest";
import { displayColorPhotos, withColorPhotos } from "./color-photos";
import { buyerChoiceGroups, choiceImage } from "./product-choices";

it("troca entre três fotos manuais assinadas e não inventa uma quarta cor", () => {
  const groups = withColorPhotos([{ name: "Cor", options: ["Preto", "Branco", "Rosa"] }], { Preto: "store/preto.jpg", Branco: "store/branco.jpg", Rosa: "store/rosa.jpg", Azul: "store/azul.jpg" });
  const signed = new Map(["preto", "branco", "rosa"].map(c => [`store/${c}.jpg`, `https://example.com/${c}.jpg`]));
  const choices = buyerChoiceGroups(displayColorPhotos(groups, signed));
  expect(choiceImage(choices, { Cor: "Preto" })).toBe("https://example.com/preto.jpg");
  expect(choiceImage(choices, { Cor: "Branco" })).toBe("https://example.com/branco.jpg");
  expect(choiceImage(choices, { Cor: "Rosa" })).toBe("https://example.com/rosa.jpg");
  expect(choiceImage(choices, { Cor: "Azul" })).toBeNull();
});
it("preserva imagem oficial de importado e não expõe caminho privado sem assinatura", () => {
  const groups = displayColorPhotos([{ name: "Cor", options: ["Branco", "Preto"], images: { Branco: "https://example.com/official.jpg", Preto: "another-store/private.jpg" } }], new Map());
  expect(groups[0].images).toEqual({ Branco: "https://example.com/official.jpg" });
});