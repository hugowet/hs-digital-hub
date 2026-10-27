import { test } from "node:test";
import assert from "node:assert/strict";
import { amazonFullResImage, amazonHiResFromHtml } from "./amazon-image";

test("miniatura borrada da Amazon vira foto original", () => {
  assert.equal(amazonFullResImage("https://m.media-amazon.com/images/I/71abc._AC_SX300_SY300_.jpg"), "https://m.media-amazon.com/images/I/71abc.jpg");
});
test("galeria em alta resolução é lida da página", () => {
  assert.deepEqual(amazonHiResFromHtml('{"hiRes":"https://m.media-amazon.com/images/I/81x._AC_SL1500_.jpg"}'), ["https://m.media-amazon.com/images/I/81x.jpg"]);
});
