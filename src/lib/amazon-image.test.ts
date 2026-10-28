import { test } from "node:test";
import assert from "node:assert/strict";
import { amazonFullResImage, amazonHiResFromHtml } from "./amazon-image";

test("miniatura borrada da Amazon vira foto original", () => {
  assert.equal(amazonFullResImage("https://m.media-amazon.com/images/I/71abc._AC_SX300_SY300_.jpg"), "https://m.media-amazon.com/images/I/71abc.jpg");
});
test("galeria em alta resolução é lida da página", () => {
  assert.deepEqual(amazonHiResFromHtml(`'colorImages': { 'initial': [{"hiRes":"https://m.media-amazon.com/images/I/81x._AC_SL1500_.jpg"}]}`), ["https://m.media-amazon.com/images/I/81x.jpg"]);
});
test("fotos de outros modelos/cores na página não entram no anúncio", () => {
  const html = `'colorImages': { 'initial': [{"hiRes":"https://m.media-amazon.com/images/I/G35a.jpg"},{"hiRes":"https://m.media-amazon.com/images/I/G35b.jpg"}]}, "Pink":[{"hiRes":"https://m.media-amazon.com/images/I/G17.jpg"}] {"large":"https://m.media-amazon.com/images/I/G06.jpg"}`;
  assert.deepEqual(amazonHiResFromHtml(html), ["https://m.media-amazon.com/images/I/G35a.jpg", "https://m.media-amazon.com/images/I/G35b.jpg"]);
});
