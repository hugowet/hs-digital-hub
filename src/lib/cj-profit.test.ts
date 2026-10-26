import { test } from "node:test";
import assert from "node:assert/strict";
import { protectedCjPrice } from "./cj-profit";

for (const [cost, price, target] of [[40,72.62,63.9],[50,90.8,79.9],[60,108.98,95.9],[100,181.71,159.9]]) {
  test(`custo R$ ${cost} preserva margem após comissão de 12%`, () => {
    assert.equal(protectedCjPrice(cost,0.12),price);
    assert.ok(price * 0.88 >= target);
  });
}
test("produto caro não vende abaixo do custo após comissão", () => {
  const price=protectedCjPrice(10000,0.12);
  assert.ok(price*0.88>=10699.9);
});
test("frete embutido não recebe comissão", () => {
  assert.equal(protectedCjPrice(75,0.12,25),132.85);
});
test("custo e comissão ausentes bloqueiam venda", () => {
  assert.throws(()=>protectedCjPrice(NaN,0.12));
  assert.throws(()=>protectedCjPrice(40,NaN));
});