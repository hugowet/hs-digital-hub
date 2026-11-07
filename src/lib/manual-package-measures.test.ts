import { expect, it } from "vitest";
import { packageMeasures } from "./manual-package-measures";
it("preenche peso e dimensões com os valores informados", () => {
  expect(packageMeasures("Peso da embalagem: 250 g; Altura: 3 cm; Largura: 20 cm; Comprimento: 30 cm")).toEqual({ weightKg: "0.25", heightCm: "3", widthCm: "20", lengthCm: "30" });
});
it("não inventa medidas pelo nome ou por números sem unidade", () => {
  expect(packageMeasures("Camiseta M, largura: 20")).toEqual({ weightKg: undefined, heightCm: undefined, widthCm: undefined, lengthCm: undefined });
});