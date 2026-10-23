import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogSearchGroups, normalizeCatalogSearch } from "./catalog-search";
test("busca encontra relógios sem depender de acento", () => {
  assert.equal(normalizeCatalogSearch("RELÓGIO"), "relogio");
  assert.equal(catalogSearchGroups("relógio")[0]?.includes("watch"), true);
});
test("fone bluetooth exige ambos os conceitos, não qualquer palavra", () => {
  const groups = catalogSearchGroups("fone de ouvido bluetooth");
  assert.equal(groups.length, 3);
  assert.equal(groups[0]?.includes("earbuds"), true);
  assert.deepEqual(groups[2], ["bluetooth", "bt"]);
});