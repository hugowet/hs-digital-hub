import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogDisplayPrice } from "./product-price";

test("vitrine e detalhe mantêm R$ 203,90 sem substituir por cotação de R$ 248,90", () => {
  const product = { price: 203.90, quotedPrice: 248.90 };
  assert.equal(catalogDisplayPrice(product), 203.90);
});