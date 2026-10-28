import { test } from "node:test";
import assert from "node:assert/strict";
import { extractAmazonOptions } from "./amazon-options";

test("extracts only actual shoe numbers and colors, never a fabricated range", () => {
  const groups = extractAmazonOptions(`<div id="variation_size_name"><select><option>Selecione</option><option>38 BR</option><option>40 BR</option><option disabled>42 BR</option></select></div><div id="variation_color_name"><ul><li data-asin="B000000001"><img alt="Preto" /></li><li data-asin="B000000002"><img alt="Azul" /></li></ul></div>`);
  assert.deepEqual(groups.map(({ name, options }) => ({ name, options })), [{ name: "Tamanho", options: ["38 BR", "40 BR"] }, { name: "Cor", options: ["Preto", "Azul"] }]);
  assert.equal(groups.every((group) => group.availability === "unconfirmed"), true);
});
test("missing options never imply size or stock", () => {
  assert.deepEqual(extractAmazonOptions('<h1>Tênis masculino</h1>'), []);
});
test("preserves official clothing sizing without converting guessed measurements", () => {
  assert.deepEqual(extractAmazonOptions('<div id="variation_size_name"><span class="selection">XL</span></div>')[0]?.options, ["XL"]);
});