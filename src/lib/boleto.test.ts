import { test } from "node:test";
import assert from "node:assert/strict";
import { boletoPayer, boletoDetails } from "./boleto";

test("boleto requires a valid CPF before payment creation", () => {
  assert.throws(() => boletoPayer("buyer@example.com", { identificationNumber: "11111111111", firstName: "Ana", lastName: "Silva", address: { zipCode: "69300-000", streetName: "Rua A", streetNumber: "10", neighborhood: "Centro", city: "Boa Vista", state: "rr" } }), /CPF válido/);
});
test("boleto maps the payer address required by Mercado Pago", () => {
  const result = boletoPayer("buyer@example.com", { identificationNumber: "52998224725", firstName: "Ana", lastName: "Silva", address: { zipCode: "69300-000", streetName: "Rua A", streetNumber: "10", neighborhood: "Centro", city: "Boa Vista", state: "rr" } });
  assert.deepEqual(result.address, { zip_code: "69300000", street_name: "Rua A", street_number: "10", neighborhood: "Centro", city: "Boa Vista", federal_unit: "RR" });
});
test("only provider-hosted HTTPS boleto links are exposed", () => {
  assert.equal(boletoDetails({ transaction_details: { external_resource_url: "javascript:alert(1)" } }).boleto_url, null);
  assert.equal(boletoDetails({ transaction_details: { external_resource_url: "https://www.mercadopago.com.br/payments/123/ticket" } }).boleto_url, "https://www.mercadopago.com.br/payments/123/ticket");
});
test("boleto emission stays pending and preserves the official barcode", () => {
  const result = boletoDetails({ status_detail: "pending_waiting_payment", barcode: { content: "1".repeat(44) } });
  assert.equal(result.status_detail, "pending_waiting_payment");
  assert.equal(result.boleto_barcode, "1".repeat(44));
});