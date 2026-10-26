/** Only recorded former prices for the same delivery terms count as savings. */
export function cartSavings(items: Array<{
  quantity: number;
  price: number;
  compareAtPrice?: number | null;
  supplier?: string | null;
}>) {
  return Math.round(items.reduce((sum, item) => {
    // CJ base references do not establish a previous delivered price for this CEP.
    if (item.supplier === "cj" || !Number.isFinite(item.price) || item.price <= 0 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.compareAtPrice) || Number(item.compareAtPrice) <= item.price) return sum;
    return sum + (Number(item.compareAtPrice) - item.price) * item.quantity;
  }, 0) * 100) / 100;
}

export function quotePriceChanged(previous: number, next: number) {
  return Math.round(previous * 100) !== Math.round(next * 100);
}