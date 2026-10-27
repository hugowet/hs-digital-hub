import { test } from "node:test";
import assert from "node:assert/strict";
import { amazonVariationTemplate } from "./amazon-variations";

test("roupas preparam exatamente P M G GG XG sem confirmar estoque", () => {
  assert.deepEqual(amazonVariationTemplate({ title: "Camiseta masculina" }), [{ name: "Tamanho", options: ["P", "M", "G", "GG", "XG"], availability: "unconfirmed" }]);
});
test("calçados preparam exatamente 34 a 44 e prevalecem sobre vestuário", () => {
  assert.deepEqual(amazonVariationTemplate({ title: "Tênis", amazonCategory: "Vestuário" })[0]?.options, ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"]);
});
test("categoria identifica roupas e eletrônicos não recebem grade", () => {
  assert.equal(amazonVariationTemplate({ title: "Produto", amazonCategory: "Roupas" })[0]?.name, "Tamanho");
  assert.deepEqual(amazonVariationTemplate({ title: "Fone bluetooth" }), []);
});