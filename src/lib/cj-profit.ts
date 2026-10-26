import { calculateFinalPrice, getMarginRate } from "./pricing";

/** Preserve the tiered supplier markup after platform commission, with upward cent rounding. */
export function protectedCjPrice(costBrl: number, commissionRate: number, embeddedFreight = 0): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0 || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate >= 1 || !Number.isFinite(embeddedFreight) || embeddedFreight < 0 || embeddedFreight > costBrl) {
    throw new Error("Custo ou comissão não confirmado. Venda CJ bloqueada.");
  }
  const target = Math.max(commissionRate > 0 ? costBrl * (1 + getMarginRate(costBrl)) : calculateFinalPrice(costBrl), costBrl + 0.01);
  return Math.ceil((target - commissionRate * embeddedFreight) / (1 - commissionRate) * 100 - 1e-8) / 100;
}