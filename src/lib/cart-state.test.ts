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
  it("não soma quantidades de outra cor ao trocar a opção", () => {
    const result = mergeCartItem([{ ...item, choice: "Cor: Preto" }], { ...item, choice: "Cor: Branco" }, 1);
    expect(result[0]?.choice).toBe("Cor: Branco");
    expect(result[0]?.quantity).toBe(1);
    expect(result).toHaveLength(1);
  });
  it("soma ao adicionar pelo card de um produto com cor escolhida", () => {
    const result = mergeCartItem([{ ...item, quantity: 3, choice: "Cor: Branco", title: "Produto — Cor: Branco" }], { ...item, stock: 10 }, 1);
    expect(result[0]?.quantity).toBe(4);
    expect(result[0]?.choice).toBe("Cor: Branco");
    expect(result[0]?.title).toBe("Produto — Cor: Branco");
  });
  it("registra a cor escolhida sem zerar a quantidade já no carrinho", () => {
    const result = mergeCartItem([{ ...item, quantity: 2 }], { ...item, choice: "Cor: Preto" }, 1);
    expect(result[0]?.quantity).toBe(3);
    expect(result[0]?.choice).toBe("Cor: Preto");
  });
});