import { describe, expect, it } from "vitest";
import { mergeEditedOptions, sellerEditSchema } from "./seller-product-edit";

describe("edição completa", () => {
  it("edita cores e numerações preservando fotos oficiais e outros grupos", () => {
    const original = [{ name: "Cor", options: ["Preto"], images: { Preto: "foto" }, source: "page" }, { name: "Modelo", options: ["A"] }];
    const result = mergeEditedOptions(original, [{ name: "Cor", options: ["Preto", "Branco"] }, { name: "Tamanho (US)", options: ["10.5"] }], true);
    expect(result.find(g => g.name === "Cor")).toEqual({ ...original[0], options: ["Preto", "Branco"], availability: "unconfirmed" });
    expect(result.find(g => g.name === "Modelo")).toEqual(original[1]);
    expect(result.find(g => g.name === "Tamanho (US)")?.options).toEqual(["10.5"]);
  });
  it("remove grupos explicitamente retirados pelo vendedor", () => {
    expect(mergeEditedOptions([{ name: "Cor", options: ["Preto"] }], [], false)).toEqual([]);
  });
  it("não aceita quantidade fracionada nem preço zero", () => {
    const data = { productId: "57d9fb51-cc36-42bb-8b1c-9a183d14bca9", title: "Camisa", description: "", descriptionLong: "", price: 35, supplierCost: null, stock: 3, category: "moda", shippingOrigin: "national", weightKg: null, heightCm: null, widthCm: null, lengthCm: null, variations: null, media: null };
    expect(sellerEditSchema.parse(data).price).toBe(35);
    expect(sellerEditSchema.safeParse({ ...data, stock: 1.5 }).success).toBe(false);
    expect(sellerEditSchema.safeParse({ ...data, price: 0 }).success).toBe(false);
    expect(sellerEditSchema.parse({ ...data, compareAtPrice: 40 }).compareAtPrice).toBe(40);
    expect(sellerEditSchema.safeParse({ ...data, compareAtPrice: 30 }).success).toBe(false);
  });
});