import { describe, expect, it } from "vitest";
import { categorizeAmazonProduct } from "./amazon-category";

describe("categorizeAmazonProduct", () => {
  it("fone bluetooth -> eletronicos-gadgets", () => {
    expect(
      categorizeAmazonProduct({ title: "Fone de Ouvido Bluetooth sem fio com microfone" }),
    ).toBe("eletronicos-gadgets");
  });

  it("panela de cozinha -> casa-setup", () => {
    expect(
      categorizeAmazonProduct({ title: "Jogo de Panelas Antiaderente para Cozinha 5 peças" }),
    ).toBe("casa-setup");
  });

  it("tênis e camiseta -> moda", () => {
    expect(categorizeAmazonProduct({ title: "Tênis Esportivo Masculino Camiseta Dry" })).toBe("moda");
  });

  it("smartphone -> celulares-tv", () => {
    expect(categorizeAmazonProduct({ title: "Smartphone Samsung Galaxy 256GB" })).toBe("celulares-tv");
  });

  it("teclado e mouse -> perifericos-acessorios", () => {
    expect(categorizeAmazonProduct({ title: "Kit Teclado e Mouse sem fio para Computador" })).toBe(
      "perifericos-acessorios",
    );
  });

  it("usa a categoria original da Amazon quando nada combina (cria categoria nova)", () => {
    expect(
      categorizeAmazonProduct({ title: "Produto XPTO", amazonCategory: "Instrumentos Musicais" }),
    ).toBe("instrumentos-musicais");
  });

  it("sem pistas -> geral", () => {
    expect(categorizeAmazonProduct({ title: "XJ-9000" })).toBe("geral");
  });

  it("descrição também conta para a categorização", () => {
    expect(
      categorizeAmazonProduct({
        title: "Kit Premium 12 peças",
        description: "Conjunto de panelas e utensílios para sua cozinha",
      }),
    ).toBe("casa-setup");
  });
});
