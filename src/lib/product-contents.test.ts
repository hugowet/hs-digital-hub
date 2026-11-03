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
});
