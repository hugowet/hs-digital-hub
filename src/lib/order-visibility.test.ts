import { describe, expect, it } from "vitest";
import { isOrderVisibleToSeller, UNPAID_ORDER_VISIBILITY_MS } from "./order-visibility";

const NOW = new Date("2026-10-27T12:00:00Z").getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 60 * 60 * 1000).toISOString();

describe("isOrderVisibleToSeller (regra das 72 horas)", () => {
  it("pedido pago é sempre visível, mesmo antigo", () => {
    expect(isOrderVisibleToSeller({ payment_status: "paid", created_at: hoursAgo(200) }, NOW)).toBe(true);
  });

  it("pedido aguardando pagamento dentro de 72h continua visível", () => {
    expect(isOrderVisibleToSeller({ payment_status: "pending", created_at: hoursAgo(71) }, NOW)).toBe(true);
  });

  it("pedido aguardando pagamento com mais de 72h some da visualização", () => {
    expect(isOrderVisibleToSeller({ payment_status: "pending", created_at: hoursAgo(73) }, NOW)).toBe(false);
  });

  it("pagamento não aprovado/encerrado com mais de 72h some da visualização", () => {
    expect(isOrderVisibleToSeller({ payment_status: "failed", created_at: hoursAgo(100) }, NOW)).toBe(false);
  });

  it("o limite é exatamente 72 horas", () => {
    expect(UNPAID_ORDER_VISIBILITY_MS).toBe(72 * 60 * 60 * 1000);
  });
});

import { test as t2, expect as e2 } from "vitest";
t2("venda aprovada antiga continua visível ao vendedor", () => {
  e2(isOrderVisibleToSeller({ payment_status: "approved", status: "paid", created_at: "2026-10-28T05:58:16Z" }, Date.parse("2026-10-31T16:00:00Z"))).toBe(true);
});
