import { describe, expect, it } from "vitest";
import { assertTrackableOrder, deliveryFields, deliveryReport, showsManualPurchaseReport } from "./order-delivery";
describe("relatório exclusivo da conta solicitada", () => {
  it("exibe para hugohug12ou@gmail.com", () => {
    expect(showsManualPurchaseReport("hugohug12ou@gmail.com")).toBe(true);
    expect(showsManualPurchaseReport(" HUGOHUG12OU@gmail.com ")).toBe(true);
  });
  it("não exibe para outra conta ou visitante", () => {
    expect(showsManualPurchaseReport("hugoet373@gmail.com")).toBe(false);
    expect(showsManualPurchaseReport("vendedor@example.com")).toBe(false);
    expect(showsManualPurchaseReport(null)).toBe(false);
  });
});
describe("relatório de entrega", () => {
  it("preserva CPF, número e bairro no relatório", () => {
    const a = { cpf: "12345678900", number: "42", neighborhood: "Centro" };
    expect(deliveryFields(a)).toMatchObject(a);
    const report = deliveryReport({ id: "pedido", shipping_address: a, order_items: [{ title: "Tênis 38 Azul", quantity: 2 }] });
    expect(report).toContain("CPF: 12345678900");
    expect(report).toContain("Número: 42");
    expect(report).toContain("Bairro: Centro");
  });
  it("não inventa dados ausentes", () => expect(deliveryFields({}).cpf).toBe("Não informado"));
  it("bloqueia rastreio de outra loja", () => expect(() => assertTrackableOrder({ payment_status: "paid", order_items: [{ store_id: "outra" }] }, "minha")).toThrow());
  it("bloqueia pedido não pago", () => expect(() => assertTrackableOrder({ payment_status: "pending", order_items: [{ store_id: "minha" }] }, "minha")).toThrow());
  it("aceita pedido pago da loja", () => expect(() => assertTrackableOrder({ payment_status: "paid", order_items: [{ store_id: "minha" }] }, "minha")).not.toThrow());
});