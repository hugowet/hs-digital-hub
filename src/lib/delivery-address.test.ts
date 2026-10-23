import { expect, test } from "bun:test";
import { savedDeliveryPostalCode } from "./delivery-address";

test("usa automaticamente o CEP do endereço padrão", () => {
  expect(savedDeliveryPostalCode([{ postal_code: "01001-000", is_default: false }, { postal_code: "69305-000", is_default: true }])).toBe("69305000");
});
test("usa endereço salvo quando não existe padrão", () => {
  expect(savedDeliveryPostalCode([{ postal_code: "01001-000", is_default: false }])).toBe("01001000");
});
test("não calcula sem CEP válido salvo", () => {
  expect(savedDeliveryPostalCode([])).toBe("");
  expect(savedDeliveryPostalCode([{ postal_code: "123", is_default: true }])).toBe("");
});