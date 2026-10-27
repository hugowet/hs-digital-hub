export const HS_BANK_POLICY = {
  commissionRate: 0.12,
  repaymentRate: 0.15,
  salesHistoryDays: 30,
  launchCode: "HSBANK50",
  discountCents: 5000,
  minimumCartCents: 15000,
  buyerLimit: 10,
} as const;

// Advisory validation only. Redemption must eventually be locked atomically
// in checkout SQL after verified identity and dedicated funding are available.
export function launchCouponEligibility(input: {
  subtotalCents: number;
  priorPurchases: number;
  buyersUsed: number;
  verifiedCpf: boolean;
  identityAlreadyUsed: boolean;
  deviceAlreadyUsed: boolean;
  fundedCents: number;
}) {
  if (!Number.isSafeInteger(input.subtotalCents) || input.subtotalCents < HS_BANK_POLICY.minimumCartCents) return "minimum";
  if (input.priorPurchases !== 0) return "first_purchase";
  if (!Number.isSafeInteger(input.buyersUsed) || input.buyersUsed < 0 || input.buyersUsed >= HS_BANK_POLICY.buyerLimit) return "limit";
  if (!input.verifiedCpf || input.identityAlreadyUsed || input.deviceAlreadyUsed) return "identity";
  if (!Number.isSafeInteger(input.fundedCents) || input.fundedCents < HS_BANK_POLICY.discountCents) return "funding";
  return "eligible";
}

export function hasRecentPaidSale(sales: { status: string; paidAt: string | null }[], now: number) {
  const cutoff = now - HS_BANK_POLICY.salesHistoryDays * 86400000;
  return sales.some((sale) => {
    const paidAt = sale.paidAt ? Date.parse(sale.paidAt) : NaN;
    return sale.status === "approved" && paidAt >= cutoff && paidAt <= now;
  });
}

export function repaymentCents(saleCents: number, debtCents: number) {
  if (!Number.isSafeInteger(saleCents) || !Number.isSafeInteger(debtCents) || saleCents < 0 || debtCents < 0) throw new Error("Valores inválidos.");
  return Math.min(debtCents, Math.round(saleCents * HS_BANK_POLICY.repaymentRate));
}