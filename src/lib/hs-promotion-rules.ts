export const PROMOTION_LIMIT = 50;
export const PROMOTION_DAYS = 15;
export const PROMOTION_SHARES = [0.25, 0.35, 0.5] as const;
export function promotionEstimate(regular: number, cost: number | null, commission: number, share: number) {
  if (cost === null || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(regular) || regular <= 0 || !Number.isFinite(commission) || commission < 0 || commission >= 1 || !PROMOTION_SHARES.some(s => s === share)) return null;
  const margin = regular * (1 - commission) - cost;
  if (margin <= 0) return null;
  const price = Math.ceil(((cost + margin * (1 - share)) / (1 - commission)) * 100 - 1e-8) / 100;
  const profit = Math.round((price - Math.round(price * commission * 100) / 100 - cost) * 100) / 100;
  if (price >= regular || profit <= 0) return null;
  return { price, profit };
}