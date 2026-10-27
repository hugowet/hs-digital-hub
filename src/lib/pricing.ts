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
  return commercialEnding(raw);
}

/** Terminação comercial ,90/,97. */
function commercialEnding(raw: number): number {
  const baseInt = Math.floor(raw);
  const cents = Math.round((raw - baseInt) * 100);
  let finalPrice: number;
  if (cents >= 94) finalPrice = baseInt + 0.97;
  else if (cents === 0) finalPrice = baseInt - 1 + 0.9;
  else finalPrice = baseInt + 0.9;
  return Number(finalPrice.toFixed(2));
}

/**
 * Estratégia de ticket baixo (custo até R$ 100): margem fixa para a vitrine
 * parecer barata sem quebrar o lucro — R$ 15 na primeira compra do cliente,
 * R$ 20 da segunda em diante. Acima de R$ 100 vale a tabela dinâmica.
 */
export const LOW_TICKET_LIMIT = 100;
export const FIRST_PURCHASE_MARGIN = 15;
export const REPEAT_PURCHASE_MARGIN = 20;

/** Margem fixa em reais para custo até R$ 100; null acima disso (usa a tabela dinâmica). */
export function lowTicketMargin(costBrl: number, firstPurchase: boolean): number | null {
  if (!Number.isFinite(costBrl) || costBrl <= 0 || costBrl > LOW_TICKET_LIMIT) return null;
  return firstPurchase ? FIRST_PURCHASE_MARGIN : REPEAT_PURCHASE_MARGIN;
}

export function calculateLowTicketPrice(costBrl: number, margin: number): number {
  if (!Number.isFinite(costBrl) || costBrl <= 0) return 0;
  return commercialEnding(costBrl + margin);
}

/**
 * Preço estampado da vitrine para produtos Amazon: custo até R$ 100 leva a
 * margem de primeira compra (R$ 15) para parecer barato; acima, tabela dinâmica.
 */
export function calculateAmazonPrice(costBrl: number): number {
  const margin = lowTicketMargin(costBrl, true);
  return margin === null ? calculateFinalPrice(costBrl) : calculateLowTicketPrice(costBrl, margin);
}
