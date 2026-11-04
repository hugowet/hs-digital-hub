import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogDisplayPrice, canAddProductToCart } from "./product-price";

test("vitrine e detalhe mantêm R$ 203,90 sem substituir por cotação de R$ 248,90", () => {
  const product = { price: 203.90, quotedPrice: 248.90 };
  assert.equal(catalogDisplayPrice(product), 203.90);
});

test("CJ com estoque pode entrar no carrinho pelo preço base sem cotação de frete", () => {
  const product = { supplier: "cj", price: 66.71, stock: 3, quotedPrice: null, postalCode: "76801000" };
  assert.equal(catalogDisplayPrice(product), 66.71);
  assert.equal(canAddProductToCart(product), true);
});

test("falha ou espera do frete não bloqueia CJ com estoque", () => {
  for (const quoteState of ["pending", "failed", "expired"]) {
    const product = { supplier: "cj", stock: 2, quoteState };
    assert.equal(canAddProductToCart(product, 2), true);
  }
});

test("estoque zerado, desconhecido ou insuficiente continua bloqueado", () => {
  for (const stock of [0, null, undefined, NaN, -1]) {
    assert.equal(canAddProductToCart({ stock }), false);
  }
  assert.equal(canAddProductToCart({ stock: 2 }, 3), false);
});