import { test } from "node:test";
import assert from "node:assert/strict";
import { cjVariantOptions, cjVariantStock } from "./cj-variants";

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