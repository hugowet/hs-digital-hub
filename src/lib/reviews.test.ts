import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewInput, reviewLocation, reviewPhotoPath } from "./reviews";
test("avaliação com foto mantém referência persistente por usuário, produto e avaliação", () => {
  assert.equal(reviewPhotoPath("user", "product", "review", 0), "user/product/review/0.jpg");
});
test("cidade e estado informados são preservados juntos e continuam opcionais", () => {
  assert.equal(reviewLocation(" Boa Vista ", "RR"), "Boa Vista - RR");
  assert.equal(reviewLocation("", ""), "");
  assert.throws(() => reviewLocation("Boa Vista", "XX"));
  assert.throws(() => reviewLocation("a".repeat(91), "RR"));
});
test("não aceita avaliação sem comentário nem nota fora de 1 a 5", () => {
  const input = { id: "11111111-1111-4111-8111-111111111111", productId: "22222222-2222-4222-8222-222222222222", author: "Hugo", rating: 5, comment: "Ótimo", photoPaths: [] };
  assert.equal(reviewInput.safeParse(input).success, true);
  assert.equal(reviewInput.safeParse({ ...input, comment: " " }).success, false);
  assert.equal(reviewInput.safeParse({ ...input, rating: 6 }).success, false);
});