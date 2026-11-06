import { test } from "node:test";
import assert from "node:assert/strict";
import { extractAmazonOptions, shouldReplaceOptions } from "./amazon-options";

test("extracts only actual shoe numbers and colors, never a fabricated range", () => {
  const groups = extractAmazonOptions(`<div id="variation_size_name"><select><option>Selecione</option><option>38 BR</option><option>40 BR</option><option disabled>42 BR</option></select></div><div id="variation_color_name"><ul><li data-asin="B000000001"><img alt="Preto" /></li><li data-asin="B000000002"><img alt="Azul" /></li></ul></div>`);
  assert.deepEqual(groups.map(({ name, options }) => ({ name, options })), [{ name: "Tamanho", options: ["38 BR", "40 BR"] }, { name: "Cor", options: ["Preto", "Azul"] }]);
  assert.equal(groups.every((group) => group.availability === "unconfirmed"), true);
});
test("missing options never imply size or stock", () => {
  assert.deepEqual(extractAmazonOptions('<h1>Tênis masculino</h1>'), []);
});
test("a size-only JSON does not hide actual colors exposed in swatches", () => {
  const groups = extractAmazonOptions(`<script>"variationValues":{"size_name":["P","M","G"]}</script><div id="inline-twister-row-color_name"><li data-asin="B0HPXF119V"><img alt="Preto" src="https://m.media-amazon.com/images/I/41j3WswtYaL._SS64_.jpg"></li><li data-asin="B0HPXF1QLP"><img alt="Branco" src="https://m.media-amazon.com/images/I/41v-wF-tDIL._SS64_.jpg"></li></div>`);
  assert.deepEqual(groups.find((g) => g.name === "Cor")?.options, ["Preto", "Branco"]);
  assert.deepEqual(groups.find((g) => g.name === "Tamanho")?.options, ["P", "M", "G"]);
  assert.equal(groups.every((g) => g.availability === "unconfirmed"), true);
  assert.equal(shouldReplaceOptions([{ name: "Tamanho", options: ["P", "M", "G", "GG", "XG"] }], groups), true);
});
test("associates named helmet swatches with real full resolution photos without confirming stock", () => {
  const groups = extractAmazonOptions(`<script>"variationValues":{"color_name":["Branco","Preto","Rosa"]}</script><div id="inline-twister-row-color_name"><li><img alt="Branco" src="https://m.media-amazon.com/images/I/white._SS64_.jpg"></li><li><img alt="Preto" src="https://m.media-amazon.com/images/I/black._SS64_.jpg"></li><li><img alt="Rosa" src="https://m.media-amazon.com/images/I/pink._SS64_.jpg"></li></div>`);
  assert.deepEqual(groups[0]?.images, { Branco: "https://m.media-amazon.com/images/I/white.jpg", Preto: "https://m.media-amazon.com/images/I/black.jpg", Rosa: "https://m.media-amazon.com/images/I/pink.jpg" });
  assert.equal(groups[0]?.availability, "unconfirmed");
  assert.equal(shouldReplaceOptions([{ name: "Cor", options: ["Branco", "Preto", "Rosa"] }], groups), true);
});
test("does not associate conflicting, unrelated or unsafe image URLs", () => {
  const groups = extractAmazonOptions(`<script>"variationValues":{"color_name":["Branco","Preto"]}</script><div id="variation_color_name"><li><img alt="Branco" src="https://m.media-amazon.com/images/I/one.jpg"><img alt="Branco" src="https://m.media-amazon.com/images/I/two.jpg"></li><li><img alt="Preto" src="https://other.example/black.jpg"></li></div><img alt="Preto" src="https://m.media-amazon.com/images/I/unrelated.jpg">`);
  assert.equal(groups[0]?.images, undefined);
});
test("preserves official clothing sizing without converting guessed measurements", () => {
  assert.deepEqual(extractAmazonOptions('<div id="variation_size_name"><span class="selection">XL</span></div>')[0]?.options, ["XL"]);
});
test("lê todas as dimensões do variationValues e troca opções incompletas", () => {
  const g = extractAmazonOptions(`<script>"variationValues":{"size_name":["38","39"],"color_name":["Verde","Grafite","Cinza"],"memory_storage_capacity":["128 GB","256 GB"]}</script>`);
  assert.deepEqual(g.map((x) => x.name), ["Cor", "Tamanho", "Armazenamento"]);
  assert.equal(shouldReplaceOptions([{ name: "Cor", options: ["Verde"] }], g), true);
  assert.equal(shouldReplaceOptions(g, g), false);
});
