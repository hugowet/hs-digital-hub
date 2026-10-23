import { test } from "node:test";
import assert from "node:assert/strict";
import { priceCjShipment, cjFreightUsd } from "./cj-landed-pricing";

test("produto mais frete em reais recebem juntos a margem Amazon", () => {
  const result = priceCjShipment([{ productId: "a", quantity: 1, costUsd: 10 }], 5, 5);
  assert.equal(result.items[0].landed_price, 119.9);
  assert.equal(result.items[0].unit_price, 119.9);
  assert.equal(result.amount, 0);
  assert.equal(result.freightBrl, 25);
});
test("compra abaixo de 89,90 cobra frete uma única vez", () => {
  const result = priceCjShipment([{ productId: "a", quantity: 1, costUsd: 2 }], 2, 5);
  assert.equal(result.landedTotal, 43.9);
  assert.equal(result.items[0].unit_price, 33.9);
  assert.equal(result.amount, 10);
  assert.equal(result.items[0].unit_price + result.amount, 43.9);
});
test("aumento do frete recalcula o preço final", () => {
  assert.equal(priceCjShipment([{ productId: "a", quantity: 1, costUsd: 10 }], 6, 5).landedTotal, 127.9);
});
test("aumento do produto recalcula o preço final", () => {
  assert.equal(priceCjShipment([{ productId: "a", quantity: 1, costUsd: 12 }], 5, 5).landedTotal, 135.9);
});
test("quantidades dividem frete consolidado sem multiplicá-lo", () => {
  const result = priceCjShipment([{ productId: "a", quantity: 2, costUsd: 10 }], 5, 5);
  assert.equal(result.freightBrl, 25);
  assert.equal(result.items[0].embedded_freight * 2, 25);
  assert.equal(result.landedTotal, 199.8);
});
test("frete ausente nunca vira zero e total oficial não duplica taxas", () => {
  assert.throws(() => cjFreightUsd({}));
  assert.equal(cjFreightUsd({ logisticPrice: 5, totalPostageFee: 7, taxesFee: 2 }), 7);
});