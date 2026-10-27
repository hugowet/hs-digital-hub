import { describe, expect, it } from "vitest";
import { HS_BANK_POLICY, creditAnalysisCents, hasRecentPaidSale, launchCouponEligibility, repaymentCents } from "./hs-bank-rules";

const valid = { subtotalCents: 15000, priorPurchases: 0, buyersUsed: 9, verifiedCpf: true, identityAlreadyUsed: false, deviceAlreadyUsed: false, fundedCents: 5000 };
describe("HS Bank financial safeguards", () => {
  it("uses 30% of revenue only as an analysis reference", () => {
    expect(creditAnalysisCents(100000)).toBe(30000);
    expect(creditAnalysisCents(0)).toBe(0);
  });
  it("requires 90 days as the consistency analysis reference", () => expect(HS_BANK_POLICY.consistencyDays).toBe(90));
  it("keeps the confirmed 12% commission", () => expect(HS_BANK_POLICY.commissionRate).toBe(0.12));
  it("requires paid sales within the last 30 days", () => {
    const now = Date.parse("2026-10-27T05:02:00Z");
    expect(hasRecentPaidSale([{ status: "approved", paidAt: "2026-09-27T05:02:00Z" }], now)).toBe(true);
    expect(hasRecentPaidSale([{ status: "approved", paidAt: "2026-09-27T05:01:59Z" }], now)).toBe(false);
    expect(hasRecentPaidSale([{ status: "pending", paidAt: "2026-10-26T00:00:00Z" }], now)).toBe(false);
    expect(hasRecentPaidSale([{ status: "approved", paidAt: "2026-10-28T00:00:00Z" }], now)).toBe(false);
  });
  it("caps proposed 15% repayment at remaining debt", () => {
    expect(repaymentCents(10000, 5000)).toBe(1500);
    expect(repaymentCents(10000, 1000)).toBe(1000);
    expect(repaymentCents(10000, 0)).toBe(0);
  });
  it("sets the launch discount to exactly R$50", () => expect(HS_BANK_POLICY.discountCents).toBe(5000));
  it("requires a cart of at least R$150", () => {
    expect(launchCouponEligibility({ ...valid, subtotalCents: 14999 })).toBe("minimum");
    expect(launchCouponEligibility(valid)).toBe("eligible");
  });
  it("restricts the campaign to the first 10 buyers", () => expect(launchCouponEligibility({ ...valid, buyersUsed: 10 })).toBe("limit"));
  it("restricts the launch offer to first purchases", () => expect(launchCouponEligibility({ ...valid, priorPurchases: 1 })).toBe("first_purchase"));
  it("requires verified CPF and disallows CPF reuse", () => {
    expect(launchCouponEligibility({ ...valid, verifiedCpf: false })).toBe("identity");
    expect(launchCouponEligibility({ ...valid, identityAlreadyUsed: true })).toBe("identity");
  });
  it("disallows device reuse", () => expect(launchCouponEligibility({ ...valid, deviceAlreadyUsed: true })).toBe("identity"));
  it("requires R$50 of separate funding, preserving seller proceeds", () => {
    expect(launchCouponEligibility({ ...valid, fundedCents: 4999 })).toBe("funding");
    expect(launchCouponEligibility({ ...valid, fundedCents: 5000 })).toBe("eligible");
  });
});