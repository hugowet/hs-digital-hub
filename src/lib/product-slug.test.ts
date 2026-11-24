import { describe, expect, it } from "vitest";
import { productIdFromParam, productSlugParam } from "@/lib/seo";

const id = "123e4567-e89b-42d3-a456-426614174000";
describe("links com nome do produto", () => {
  it("tira acentos, espaços e símbolos do nome", () => {
    expect(productSlugParam(id, "Ventilador Mesa Ação 30cm / Preto!")).toBe(`ventilador-mesa-acao-30cm-preto-${id}`);
  });
  it("link antigo só com código continua achando o produto", () => {
    expect(productIdFromParam(id)).toBe(id);
    expect(productIdFromParam(`ventilador-${id}`)).toBe(id);
  });
});
