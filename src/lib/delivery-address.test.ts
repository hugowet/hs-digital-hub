import { test } from "node:test";
import assert from "node:assert/strict";
import { savedDeliveryPostalCode } from "./delivery-address";

test("usa automaticamente o CEP do endereço padrão", () => {
  assert.equal(savedDeliveryPostalCode([{ postal_code: "01001-000", is_default: false }, { postal_code: "69305-000", is_default: true }]), "69305000");
});
test("usa endereço salvo quando não existe padrão", () => {
  assert.equal(savedDeliveryPostalCode([{ postal_code: "01001-000", is_default: false }]), "01001000");
});
test("não calcula sem CEP válido salvo", () => {
  assert.equal(savedDeliveryPostalCode([]), "");
  assert.equal(savedDeliveryPostalCode([{ postal_code: "123", is_default: true }]), "");
});