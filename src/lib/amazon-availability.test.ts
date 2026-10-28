import { describe, expect, it } from "vitest";
import { confirmedAmazonStock, extractAmazonAvailability } from "./amazon-availability";

describe("Amazon supplier availability", () => {
  it("blocks products explicitly out of stock even with a stale buy button", () => {
    expect(extractAmazonAvailability('<span id="productTitle">Fone</span><div id="availability">Atualmente indisponível.</div><input id="add-to-cart-button">')).toBe("unavailable");
    expect(confirmedAmazonStock("unavailable", false)).toBe(0);
  });
  it("restores one confirmed unit only on explicit restock", () => {
    expect(extractAmazonAvailability('<span id="productTitle">Fone</span><div id="availability">Em estoque</div><input id="add-to-cart-button">')).toBe("available");
    expect(confirmedAmazonStock("available", false)).toBe(1);
  });
  it("never infers stock from price, recommendations or blocked pages", () => {
    expect(extractAmazonAvailability('<span id="productTitle">Fone</span><div>Em estoque R$ 50</div>')).toBe("unknown");
    expect(extractAmazonAvailability('<input id="captchacharacters"><div id="availability">Em estoque</div>')).toBe("unknown");
    expect(confirmedAmazonStock("unknown", false)).toBe(0);
  });
  it("does not unlock unconfirmed sizes and colors", () => {
    expect(confirmedAmazonStock("available", true)).toBe(0);
  });
});