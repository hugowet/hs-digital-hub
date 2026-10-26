import { test } from "node:test";
import assert from "node:assert/strict";
import { cartSavings, quotePriceChanged } from "./cart-savings";

test("economia usa preço anterior registrado e quantidade", () => {
  assert.equal(cartSavings([{ price: 40, compareAtPrice: 50, quantity: 2, supplier: "own" }]), 20);
});
test("referência inexistente não inventa economia", () => {
  assert.equal(cartSavings([{ price: 40, quantity: 1 }]), 0);
});
test("preço CJ sem mesma cotação de entrega não conta como desconto", () => {
  assert.equal(cartSavings([{ price: 40, compareAtPrice: 100, quantity: 1, supplier: "cj" }]), 0);
});
test("mesmo preço confirmado não exige mudança no carrinho", () => {
  assert.equal(quotePriceChanged(106.37, 106.37), false);
  assert.equal(quotePriceChanged(106.37, 116.37), true);
});