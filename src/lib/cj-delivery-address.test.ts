import { test } from "node:test";
import assert from "node:assert/strict";
import { cjDeliveryAddress } from "./cj-delivery-address";

test("CJ receives the saved checkout CEP including postalCode spelling", () => {
  assert.equal(cjDeliveryAddress({ postalCode: "76940-000" }).shippingZip, "76940000");
});
test("CJ receives street, number and neighborhood for manual delivery", () => {
  assert.equal(cjDeliveryAddress({ address: "Rua de teste", number: "123", neighborhood: "Centro" }).shippingAddress,
    "Rua de teste, 123, Centro");
});
test("legacy CEP remains supported and missing data is never invented", () => {
  assert.equal(cjDeliveryAddress({ postal_code: "76940000" }).shippingZip, "76940000");
  assert.equal(cjDeliveryAddress({ number: "123" }).shippingAddress, "");
  assert.equal(cjDeliveryAddress({}).shippingZip, "");
});