import { test } from "node:test";
import assert from "node:assert/strict";
import { deliveryDateRange } from "./delivery-estimate";

test("delivery date interval uses the provider min and max, crossing months", () => {
  assert.deepEqual(deliveryDateRange(8, 14, "2026-10-26T12:00:00Z"), { from: "2026-11-03", to: "2026-11-09" });
});
test("missing or invalid provider timing never produces made-up dates", () => {
  for (const [min, max] of [[null, 18], [12, null], [-1, 10], [18, 12], [1.5, 10], [8, 500]]) assert.equal(deliveryDateRange(min, max, "2026-10-26"), null);
});
test("confirmed domestic business-day timing skips weekends", () => {
  assert.deepEqual(deliveryDateRange(1, 2, "2026-10-30T12:00:00Z", true), { from: "2026-11-02", to: "2026-11-03" });
});