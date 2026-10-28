import { expect, it } from "vitest";
import { isPurchasableVariant } from "./variant-availability";
it("só exibe tamanho com identidade e estoque positivo", () => {
  expect(isPurchasableVariant({ id: "size-38", stock: 3, is_active: true })).toBe(true);
  expect(isPurchasableVariant({ id: "size-39", stock: 0, is_active: true })).toBe(false);
  expect(isPurchasableVariant({ id: "size-40", stock: 4, is_active: false })).toBe(false);
  expect(isPurchasableVariant({ stock: 5 })).toBe(false);
});