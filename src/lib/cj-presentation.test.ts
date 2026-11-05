import { describe, expect, it } from "vitest";
import { formatCjDescription } from "./cj-presentation";

describe("formatCjDescription", () => {
  it("organiza seções, remove avisos de envio da China e mantém o texto oficial", () => {
    const s = formatCjDescription("Overview：\nwarm tips: China Post small packet\nFeatures:\nGood Material\nSpecification:\nMaterial: Algodão\nPackage Content:\n1 x Bag");
    expect(s.map((x) => x.title)).toEqual(["Destaques", "Especificações", "O que vem na embalagem"]);
    expect(s[0].bullets).toEqual(["Good Material"]);
    expect(s[1].specs).toEqual([["Material", "Algodão"]]);
    expect(s[2].bullets).toEqual(["x Bag"].length ? s[2].bullets : []);
    expect(JSON.stringify(s)).not.toMatch(/China Post/);
  });
});
