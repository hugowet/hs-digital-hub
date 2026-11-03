import { test } from "node:test";
import assert from "node:assert/strict";
import { sellerProductSearchPattern } from "./seller-product-search";

test("searches the entered product name literally, including wildcard characters", () => {
  assert.equal(sellerProductSearchPattern("  Titan 150  "), "%Titan 150%");
  assert.equal(sellerProductSearchPattern("50%_kit"), "%50\\%\\_kit%");
});