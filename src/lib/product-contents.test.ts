import { describe, expect, it } from "vitest";
import { extractProductContents } from "./product-contents";

describe("extractProductContents", () => {
  it("lists items under Package Included", () => {
    const r = extractProductContents("Bom produto\nPackage Included:\n10x Wallpapers\n1x Manual\n\nMétodo de entrega: x");
    expect(r.contents).toEqual(["10x Wallpapers", "1x Manual"]);
    expect(r.rest).toContain("Método de entrega");
  });
  it("splits inline Contém list", () => {
    expect(extractProductContents("Contém: válvula, jogo de junta, anéis").contents).toEqual([
      "válvula",
      "jogo de junta",
      "anéis",
    ]);
  });
  it("returns nothing when description has no contents section", () => {
    expect(extractProductContents("Celular 128GB tela grande").contents).toEqual([]);
  });
  it("preserves the entire description when highlighting included items", () => {
    const description = "Celular 128GB\nContém: carregador, fone de ouvido\nCompatibilidade: Android\nGarantia: 12 meses\n\nMais informações do fabricante.";
    const result = extractProductContents(description);
    expect(result.rest).toBe(description);
    expect(result.contents).toEqual(["carregador", "fone de ouvido"]);
  });
  it("does not treat description paragraphs as items after an inline list", () => {
    const result = extractProductContents("Contém: válvula, jogo de junta\nMotor resistente para uso diário\nMaterial: aço");
    expect(result.contents).toEqual(["válvula", "jogo de junta"]);
  });
  it("keeps specifications outside a multiline contents list", () => {
    const result = extractProductContents("Itens inclusos:\n1x Carregador\n2x Fones\nMaterial: plástico\nDescrição adicional");
    expect(result.contents).toEqual(["1x Carregador", "2x Fones"]);
  });
});
