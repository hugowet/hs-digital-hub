import { test } from "node:test";
import assert from "node:assert/strict";
import { cjShippingModalities, includeFirstPurchaseMargin } from "./shipping-modalities";

const option = (code: string, freight: number, price: number, days: number) => ({
  serviceCode: code, serviceName: code, amount: 0, deliveryDaysMax: days,
  providerPayload: { supplier_freight_brl: freight, embedded_free_shipping: true,
    priced_items: [{ product_id: "a", quantity: 1, unit_price: price }], first_purchase_margin_included: 0 },
});
test("o carrinho oferece apenas duas modalidades, não oito serviços", () => {
  const result = cjShippingModalities(Array.from({ length: 8 }, (_, index) => option(`${index}`, 20 + index, 100 + index, 50 - index)));
  assert.equal(result.length, 2);
});
test("Express mantém o preço com frete incluso e Premium cobra somente a diferença explícita", () => {
  const result = cjShippingModalities([option("fast", 40, 140, 10), option("cheap", 25, 119.9, 30)]);
  assert.equal(result[0].providerPayload.priced_items[0].unit_price, 119.9);
  assert.equal(result[0].amount, 0);
  assert.equal(result[1].providerPayload.priced_items[0].unit_price, 119.9);
  assert.equal(result[1].amount, 20.1);
});
test("os R$10 da primeira compra já estão no preço anunciado, não no total do carrinho", () => {
  const result = includeFirstPurchaseMargin(cjShippingModalities([option("cheap", 25, 119.9, 30)]), true);
  assert.equal(result[0].providerPayload.priced_items[0].unit_price, 129.9);
  assert.equal(result[0].amount, 0);
  assert.equal(result[0].providerPayload.first_purchase_margin_included, 10);
});
test("compras seguintes não recebem os R$10", () => {
  const result = includeFirstPurchaseMargin([option("cheap", 25, 119.9, 30)], false);
  assert.equal(result[0].providerPayload.priced_items[0].unit_price, 119.9);
});