/**
 * Regra única de precificação para todos os fornecedores (Amazon, CJ, nacionais).
 * Margem dinâmica por faixa de custo em reais + terminação comercial ,90/,97.
 */
export function getMarginRate(cost: number): number {
  if (cost <= 30) return 1.2;
  if (cost <= 100) return 0.6;
  if (cost <= 300) return 0.4;
  if (cost <= 1000) return 0.2;
  if (cost <= 2000) return 0.14;
  if (cost <= 5000) return 0.09;
  if (cost <= 10000) return 0.07;
  return 0.05;
}

export function calculateFinalPrice(costBrl: number): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0) return 0;
  const raw = costBrl * (1 + getMarginRate(costBrl));
  const baseInt = Math.floor(raw);
  const cents = Math.round((raw - baseInt) * 100);
  let finalPrice: number;
  if (cents >= 94) finalPrice = baseInt + 0.97;
  else if (cents === 0) finalPrice = baseInt - 1 + 0.9;
  else finalPrice = baseInt + 0.9;
  return Number(finalPrice.toFixed(2));
}
