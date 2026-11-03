import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTrendTerms } from "./amazon-trend-categories";
import { withAmazonSizeFallback } from "./amazon-variations";
import { extractAmazonOptions } from "./amazon-options";

test("'modas' expande para roupas e sapatos", () => {
  const t = resolveTrendTerms("Modas");
  assert.ok(t.some((x) => /camiseta|vestido/.test(x)));
  assert.ok(t.some((x) => /tênis|sandália/.test(x)));
});
test("termo desconhecido continua igual", () => assert.deepEqual(resolveTrendTerms("drone"), ["drone"]));
test("roupa só com cor ganha grade P–XG", () => {
  const g = withAmazonSizeFallback([{ name: "Cor", options: ["Preto"] }], { title: "Camiseta básica" });
  assert.deepEqual(g[0].options, ["P", "M", "G", "GG", "XG"]);
});
test("tamanhos reais da página são mantidos", () => {
  const g = withAmazonSizeFallback([{ name: "Tamanho", options: ["38", "40"] }], { title: "Tênis corrida" });
  assert.equal(g.length, 1);
});
test("lê numeração do dimensionValuesDisplayData", () => {
  const g = extractAmazonOptions(`<script>"dimensionsDisplay":["Tamanho","Cor"],"dimensionValuesDisplayData":{"B0A":["39","Preto"],"B0B":["40","Preto"],"B0C":["41","Branco"]}</script>`);
  assert.deepEqual(g.map((x) => x.options), [["Preto", "Branco"], ["39", "40", "41"]]);
});
test("lê inline twister de moda", () => {
  const g = extractAmazonOptions(`<div id="inline-twister-row-size_name"><ul><li><span class="swatch-title-text-display">M</span></li><li><span class="swatch-title-text-display">G</span></li><li class="swatch-unavailable"><span class="swatch-title-text-display">GG</span></li></ul></div>`);
  assert.deepEqual(g[0].options, ["M", "G"]);
});
import { parseTrendQuery } from "./amazon-trend-categories";
test("ATE60 limita a R$ 60", () => assert.equal(parseTrendQuery("ate60").maxPrice, 60));
test("ATE60 com categoria mantém categoria", () => assert.ok(parseTrendQuery("ATE60 moda").terms.some((x) => /camiseta/.test(x))));
test("sem chave não limita", () => assert.equal(parseTrendQuery("moda").maxPrice, null));

test("ATE100 a ATE500 limitam o preço", () => {
  for (const v of [100, 150, 300, 350, 500]) assert.equal(parseTrendQuery(`ATE${v}`).maxPrice, v);
});
test("ATE70 não é chave", () => assert.equal(parseTrendQuery("ATE70").maxPrice, null));
test("PECASMOTO começa na Biz e só ela", () => {
  const q = parseTrendQuery("PECASMOTO", 0, 6);
  assert.equal(q.vehicle, "Biz");
  assert.ok(q.terms.every((t) => t.endsWith("Biz")));
});
test("PECASMOTO termina as peças da Biz antes de pular para a CG", () => {
  const q = parseTrendQuery("PECASMOTO", 6, 6);
  assert.equal(q.terms.length, 2);
  assert.equal(parseTrendQuery("PECASMOTO", q.nextCursor!, 6).vehicle, "CG 160");
});
test("PECASCARRO gol fica só no Gol", () => assert.equal(parseTrendQuery("PECASCARRO gol").vehicle, "Gol"));

test("'biz' sozinho puxa peças da Biz", () => {
  const q = parseTrendQuery("biz");
  assert.equal(q.vehicle, "biz");
  assert.ok(q.terms.every((t) => t.endsWith("biz")) && q.total! > 20);
});
test("CB 300 2008/2009 inclui o ano", () => {
  const q = parseTrendQuery("CB 300 2008/2009");
  assert.ok(q.terms.every((t) => t.endsWith("CB 300 2008/2009")));
});
test("modelo + ano avança pelas peças", () => {
  const q = parseTrendQuery("Gol 2012", 0, 6);
  assert.notEqual(parseTrendQuery("Gol 2012", q.nextCursor!, 6).terms[0], q.terms[0]);
});
test("categoria comum continua igual", () => assert.ok(parseTrendQuery("moda").terms.some((x) => /camiseta/.test(x))));

test("caminhão puxa peças de caminhão", () => assert.ok(parseTrendQuery("caminhão").terms.every((t) => /caminhão/.test(t))));
test("bicicleta puxa peças", () => assert.ok(parseTrendQuery("bicicleta").terms.some((t) => /pneu bicicleta/.test(t))));
test("Ranger vira peças de carro", () => assert.equal(parseTrendQuery("Ranger 2015").vehicle, "Ranger 2015"));
test("celular puxa capinha, película e tela", () => {
  const all = [0, 6].flatMap((c) => parseTrendQuery("celular", c, 6).terms).join("|");
  for (const w of ["capinha", "película", "carregador", "fone", "tela"]) assert.ok(all.includes(w), w);
});
test("iphone 13 puxa acessórios do modelo", () => assert.ok(parseTrendQuery("iphone 13").terms.includes("capinha iphone 13")));
