import { describe, expect, it } from "vitest";
import { sanitizeAmazonText, buildAmazonDescription, sanitizeAmazonSpecs, AMAZON_DELIVERY_METHOD_TEXT } from "./amazon-text";

describe("limpeza de menções à Amazon", () => {
  it("remove o nome Amazon do texto", () => {
    expect(sanitizeAmazonText("Vendido e enviado pela Amazon.com.br")).not.toMatch(/amazon\.com/i);
    expect(sanitizeAmazonText("Produto Amazon Basics")).toBe("Produto Linha Essencial");
  });

  it("troca selo Escolha da Amazon por Escolha dos Clientes", () => {
    expect(sanitizeAmazonText("Escolha da Amazon em fones")).toBe("Escolha dos Clientes em fones");
  });

  it("descrição final sempre inclui o método de entrega e não cita Amazon fora dele", () => {
    const desc = buildAmazonDescription("• Fone bluetooth\n• Bateria 30h");
    expect(desc).toContain(AMAZON_DELIVERY_METHOD_TEXT);
    expect(desc.replace(AMAZON_DELIVERY_METHOD_TEXT, "")).not.toMatch(/\bamazon\b/i);
  });

  it("não duplica o método de entrega", () => {
    const once = buildAmazonDescription("Texto");
    const twice = buildAmazonDescription(once);
    expect(twice.match(/Método de entrega:/g)).toHaveLength(1);
    expect(twice).toBe(once);
  });

  it("preserva os parágrafos e a lista de itens da descrição importada", () => {
    const original = "Celular com tela de 6 polegadas\n\nContém: carregador, fone de ouvido\n\nGarantia de 12 meses";
    expect(buildAmazonDescription(original).split("\n\nMétodo de entrega:")[0]).toBe(original);
  });

  it("limpa chaves e valores das especificações", () => {
    const specs = sanitizeAmazonSpecs({ "Compatível com": "Amazon Alexa e Amazon Echo" });
    expect(Object.values(specs).join(" ")).not.toMatch(/\bamazon\b/i);
  });
});
