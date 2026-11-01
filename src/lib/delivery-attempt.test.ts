import { describe, expect, it } from "vitest";
import { deliveryAttemptInput } from "./delivery-attempt";

const input = { storeId: "00000000-0000-4000-8000-000000000001", orderId: "00000000-0000-4000-8000-000000000002", occurredAt: "2026-10-31T14:45:00-04:00", note: "Destinatário ausente." };
describe("tentativas reais de entrega", () => {
  it("preserva horário com fuso e motivo informado", () => expect(deliveryAttemptInput.parse(input)).toEqual(input));
  it("exige motivo não vazio", () => expect(deliveryAttemptInput.safeParse({ ...input, note: "  " }).success).toBe(false));
  it("rejeita horário inválido", () => expect(deliveryAttemptInput.safeParse({ ...input, occurredAt: "hoje" }).success).toBe(false));
});