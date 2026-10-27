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
test("celular encontra smartphone e telefone", () => {
  const groups = catalogSearchGroups("celular");
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.includes("smartphone"), true);
  assert.equal(groups[0]?.includes("telefone"), true);
});
test("tênis encontra sapato e calçado", () => {
  const groups = catalogSearchGroups("tênis");
  assert.equal(groups[0]?.includes("sapato"), true);
  assert.equal(groups[0]?.includes("calcado"), true);
  const doc = normalizeCatalogSearch("Sapato casual masculino calcado confortavel moda");
  assert.equal(groups.every((g) => g.some((t) => doc.includes(t))), true);
});
test("busca identifica o produto pela ficha técnica e não só pelo título", () => {
  const groups = catalogSearchGroups("fone à prova d'água");
  const specOnly = normalizeCatalogSearch("Fone sem fio Eletronicos especificacoes: water resistant ipx7");
  assert.equal(groups.every((g) => g.some((t) => specOnly.includes(t))), true);
});