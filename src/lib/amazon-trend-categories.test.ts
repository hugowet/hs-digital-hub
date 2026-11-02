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
