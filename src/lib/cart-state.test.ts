import { describe, expect, it } from "vitest";
import { mergeCartItem, restoreCart, type CartItem } from "./cart-state";

const item: CartItem = { productId: "product", storeId: "store", title: "Produto", storeName: "Loja",
  imageUrl: null, price: 39.15, freeShipping: false, productType: "physical", stock: 5, quantity: 2 };

describe("recuperação do carrinho", () => {
  it("descarta conteúdo inválido sem quebrar a página", () => {
    expect(restoreCart('{"quantity":1}')).toEqual([]);
    expect(restoreCart('[null,{}, {"price":"invalid"}]')).toEqual([]);
    expect(restoreCart("incomplete JSON")).toEqual([]);
  });
  it("mantém itens válidos ao recuperar o carrinho", () => {
    expect(restoreCart(JSON.stringify([null, item]))).toEqual([item]);
  });
  it("usa o estoque mais recente ao adicionar novamente", () => {
    expect(mergeCartItem([item], { ...item, stock: 3 }, 2)[0]?.quantity).toBe(3);
    expect(mergeCartItem([item], { ...item, stock: 10 }, 5)[0]?.quantity).toBe(7);
  });
  it("limita também a primeira inclusão ao estoque informado", () => {
    expect(mergeCartItem([], { ...item, stock: 1 }, 2)[0]?.quantity).toBe(1);
    expect(mergeCartItem([], { ...item, stock: 0 }, 1)).toEqual([]);
  });
});