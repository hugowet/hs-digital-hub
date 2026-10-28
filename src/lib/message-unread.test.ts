import { expect, it } from "vitest";
import { isUnreadReply } from "./message-unread";
it("comprador recebe indicador para resposta não lida do vendedor", () => {
  expect(isUnreadReply({ sender_id: "seller", read_at: null }, "buyer")).toBe(true);
  expect(isUnreadReply({ sender_id: "buyer", read_at: null }, "buyer")).toBe(false);
});
it("vendedor recebe indicador para mensagem não lida do comprador", () => {
  expect(isUnreadReply({ sender_id: "buyer", read_at: null }, "seller")).toBe(true);
  expect(isUnreadReply({ sender_id: "buyer", read_at: "2026-10-28T23:00:00Z" }, "seller")).toBe(false);
});