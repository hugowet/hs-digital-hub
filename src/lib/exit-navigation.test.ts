import { test } from "vitest";
import assert from "node:assert/strict";
import { exitHistoryDelta, selectionNavigation, shouldConfirmHomeBack } from "./exit-navigation";

test("native back from the home guard asks before exiting", () => {
  assert.equal(shouldConfirmHomeBack("BACK", true, "/", "/"), true);
});
test("back closes the menu without leaving the current page", () => {
  assert.equal(shouldConfirmHomeBack("BACK", true, "/", "/", true), false);
  assert.equal(shouldConfirmHomeBack("BACK", false, "/produto/1", "/produto/1", true), false);
  assert.equal(shouldConfirmHomeBack("BACK", true, "/", "/", false), true);
});
test("product navigation is never trapped, but filtered home still confirms departure", () => {
  assert.equal(shouldConfirmHomeBack("BACK", false, "/produto/1", "/"), false);
  assert.equal(shouldConfirmHomeBack("BACK", true, "/?supplier=amazon", "/"), true);
  assert.equal(shouldConfirmHomeBack("PUSH", true, "/", "/produto/1"), false);
});

test("size selections and search changes replace their entry instead of adding Back steps", () => {
  assert.equal(selectionNavigation.replace, true);
});

test("confirmed exit skips the complete in-app history, not just the home sentinel", () => {
  assert.equal(exitHistoryDelta(0, 0), -1);
  assert.equal(exitHistoryDelta(6, 0), -7);
  assert.equal(exitHistoryDelta(8, 3), -6);
});