import { test } from "node:test";
import assert from "node:assert/strict";
import { cjShippingModalities } from "./shipping-modalities";
import { priceCjShipment } from "./cj-landed-pricing";
import { calculateAmazonPrice, lowTicketMargin, LOW_TICKET_LIMIT } from "./pricing";

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

// Estratégia de ticket baixo: R$ 15 de margem na 1ª compra, R$ 20 da 2ª em diante (custo até R$ 100).
test("primeira compra CJ com custo até R$100 leva margem fixa de R$15", () => {
  // custo US$ 10 + frete US$ 5, câmbio 5.0 → landedCost = 50 + 25 = 75 (≤ 100)
  const priced = priceCjShipment([{ productId: "a", quantity: 1, costUsd: 10 }], 5, 5, 0.12, true);
  assert.equal(priced.firstPurchaseMarginTotal, 15);
  // preço = (75 + 15 − 0.12·25) / 0.88 arredondado para cima = 98.87
  assert.equal(priced.items[0].landed_price, 98.87);
});

test("da segunda compra em diante a margem fixa sobe para R$20", () => {
  const priced = priceCjShipment([{ productId: "a", quantity: 1, costUsd: 10 }], 5, 5, 0.12, false);
  assert.equal(priced.firstPurchaseMarginTotal, 0);
  // (75 + 20 − 0.12·25) / 0.88 = 104.55
  assert.equal(priced.items[0].landed_price, 104.55);
});

test("custo acima de R$100 mantém a tabela dinâmica, sem margem fixa", () => {
  // custo US$ 30 + frete US$ 2, câmbio 5.0 → landedCost = 150 + 10 = 160 (> 100)
  const priced = priceCjShipment([{ productId: "a", quantity: 1, costUsd: 30 }], 2, 5, 0.12, true);
  assert.equal(priced.firstPurchaseMarginTotal, 0);
  assert.equal(lowTicketMargin(160, true), null);
});

test("margem fixa só vale até R$100 de custo", () => {
  assert.equal(lowTicketMargin(LOW_TICKET_LIMIT, true), 15);
  assert.equal(lowTicketMargin(LOW_TICKET_LIMIT, false), 20);
  assert.equal(lowTicketMargin(LOW_TICKET_LIMIT + 0.01, true), null);
});

test("preço estampado Amazon de ticket baixo usa a margem de R$15", () => {
  // custo 60 → 75 com terminação comercial ,90
  assert.equal(calculateAmazonPrice(60), 75.9);
  // custo 300 (> 100) segue a tabela dinâmica: 300 * 1.4 = 420 → 420.90
  assert.equal(calculateAmazonPrice(300), 420.9);
});
