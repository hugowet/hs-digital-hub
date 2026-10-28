import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldConfirmHomeBack } from "./exit-navigation";

test("native back from the home guard asks before exiting", () => {
  assert.equal(shouldConfirmHomeBack("BACK", true, "/", "/"), true);
});
test("back closes the menu without leaving the current page", () => {
  assert.equal(shouldConfirmHomeBack("BACK", true, "/", "/", true), false);
  assert.equal(shouldConfirmHomeBack("BACK", false, "/produto/1", "/produto/1", true), false);
  assert.equal(shouldConfirmHomeBack("BACK", true, "/", "/", false), true);
});
test("product navigation and search back are never trapped", () => {
  assert.equal(shouldConfirmHomeBack("BACK", false, "/produto/1", "/"), false);
  assert.equal(shouldConfirmHomeBack("BACK", true, "/?supplier=amazon", "/"), false);
  assert.equal(shouldConfirmHomeBack("PUSH", true, "/", "/produto/1"), false);
});