import { test } from "node:test";
import assert from "node:assert/strict";
import { radioRecoveryDelay, shouldRestartRadio } from "./radio-recovery";
test("buffer normal não recarrega uma rádio que voltou a tocar", () => {
  assert.equal(radioRecoveryDelay(0, true), 15000);
  assert.equal(shouldRestartRadio({ paused: false, readyState: 4 }, true), false);
  assert.equal(shouldRestartRadio({ paused: false, readyState: 2 }, true), true);
});
test("falha real usa espera crescente limitada", () => {
  assert.equal(radioRecoveryDelay(0, false), 2000);
  assert.equal(radioRecoveryDelay(1, false), 4000);
  assert.equal(radioRecoveryDelay(7, false), 30000);
});