import { expect, test } from "bun:test";
import { catalogSearchGroups, normalizeCatalogSearch } from "./catalog-search";
test("busca encontra relógios sem depender de acento", () => {
  expect(normalizeCatalogSearch("RELÓGIO")).toBe("relogio");
  expect(catalogSearchGroups("relógio")[0]).toContain("watch");
});
test("fone bluetooth exige ambos os conceitos, não qualquer palavra", () => {
  const groups = catalogSearchGroups("fone de ouvido bluetooth");
  expect(groups).toHaveLength(3);
  expect(groups[0]).toContain("earbuds");
  expect(groups[2]).toEqual(["bluetooth", "bt"]);
});