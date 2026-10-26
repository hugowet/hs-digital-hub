import { test } from "node:test";
import assert from "node:assert/strict";
import { protectedCjPrice } from "./cj-profit";

for (const [cost, price, target] of [[40,72.73,64],[50,90.91,80],[60,109.1,96],[100,181.82,160]]) {
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
  assert.equal(protectedCjPrice(75,0.12,25),132.96);
});
test("custo e comissão ausentes bloqueiam venda", () => {
  assert.throws(()=>protectedCjPrice(NaN,0.12));
  assert.throws(()=>protectedCjPrice(40,NaN));
});