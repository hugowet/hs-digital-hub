/** Buyer freight tariff; official supplier quotes remain unchanged. */
export function shippingTier(subtotal: number, free: boolean): number {
  const cents = Math.round(subtotal * 100);
  if (free || cents >= 8990) return 0;
  return cents <= 3990 ? 9.9 : 17.9;
}

export function shippingTierTotal(subtotal: number, free: boolean, warranty = 0): number {
  return Math.round((subtotal + shippingTier(subtotal, free) + warranty) * 100) / 100;
}