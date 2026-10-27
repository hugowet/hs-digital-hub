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
test("fone à prova d'água cruza objeto e atributo técnico", () => {
  const groups = catalogSearchGroups("fone à prova d'água");
  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.includes("earbuds"), true);
  assert.equal(groups[1]?.includes("waterproof"), true);
  const document = normalizeCatalogSearch("Headphone sem fio Conectividade Bluetooth Proteção Waterproof eletronicos");
  assert.equal(groups.every((group) => group.some((term) => document.includes(term))), true);
});
test("símbolos de URL e acentos não alteram os conceitos", () => {
  assert.deepEqual(catalogSearchGroups("FONE+de+OUVIDO"), catalogSearchGroups("fone de ouvido"));
});