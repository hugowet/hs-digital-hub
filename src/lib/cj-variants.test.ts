import { test } from "node:test";
import assert from "node:assert/strict";
import { cjVariantOptions, cjVariantStock, cjSellableStock } from "./cj-variants";

test("preserva os números e IDs oficiais dos calçados sem converter numeração", () => {
  const options = cjVariantOptions({ variants: [
    { vid: "CJ-38", variantKey: "Black-38", variantSellPrice: "12.50" },
    { vid: "CJ-40", variantKey: "Black-40", variantSellPrice: "13.50" },
  ] });
  assert.deepEqual(options.map((o) => [o.id, o.label, o.costUsd]), [["CJ-38", "Preto · 38", 12.5], ["CJ-40", "Preto · 40", 13.5]]);
});
test("não inventa variante nem estoque quando o fornecedor não os informa", () => {
  assert.deepEqual(cjVariantOptions({ variants: [{ variantKey: "42", variantSellPrice: 10 }] }), []);
  assert.equal(cjVariantStock({}), 0);
});
test("roupas preservam todas as opções oficiais e não convertem tamanhos", () => {
  const sizes = ["P", "M", "G", "GG", "S", "XL", "XXL"];
  const rows = sizes.map((size) => ({ vid: `official-${size}`, variantKey: `Black-${size}`, variantSellPrice: 8 }));
  assert.deepEqual(cjVariantOptions({ variants: rows }).map((v) => v.label), sizes.map((s) => `Preto · ${s}`));
});
test("estoque esgotado bloqueia e reposição confirmada libera a opção CJ", () => {
  assert.equal(cjSellableStock(cjVariantStock({ data: [{ storageNum: 0 }] })), false);
  assert.equal(cjSellableStock(cjVariantStock([{ storageNum: 12 }])), true);
});