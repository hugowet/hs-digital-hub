export function productMargin(price: number, cost: number | null, commission: number) {
  if (cost === null || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(price) || price <= 0 || !Number.isFinite(commission) || commission < 0 || commission >= 1) return null;
  return Math.round((price - Math.round(price * commission * 100) / 100 - cost) * 100) / 100;
}