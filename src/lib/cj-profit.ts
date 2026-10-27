import { calculateFinalPrice, getMarginRate } from "./pricing";

/** Preserve the tiered supplier markup after platform commission, with upward cent rounding. */
export function protectedCjPrice(costBrl: number, commissionRate: number, embeddedFreight = 0): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0 || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate >= 1 || !Number.isFinite(embeddedFreight) || embeddedFreight < 0 || embeddedFreight > costBrl) {
    throw new Error("Custo ou comissão não confirmado. Venda CJ bloqueada.");
  }
  const target = Math.max(commissionRate > 0 ? costBrl * (1 + getMarginRate(costBrl)) : calculateFinalPrice(costBrl), costBrl + 0.01);
  return Math.ceil((target - commissionRate * embeddedFreight) / (1 - commissionRate) * 100 - 1e-8) / 100;
}

/** Ticket baixo (até R$ 100 de custo): margem fixa em reais (R$ 15 primeira compra / R$ 20 demais), comissão preservada. */
export function protectedCjFlatPrice(costBrl: number, commissionRate: number, embeddedFreight: number, flatMargin: number): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0 || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate >= 1 || !Number.isFinite(embeddedFreight) || embeddedFreight < 0 || embeddedFreight > costBrl || !Number.isFinite(flatMargin) || flatMargin <= 0) {
    throw new Error("Custo ou comissão não confirmado. Venda CJ bloqueada.");
  }
  const target = costBrl + flatMargin;
  return Math.ceil((target - commissionRate * embeddedFreight) / (1 - commissionRate) * 100 - 1e-8) / 100;
}