/** Catalog and detail deliberately use the same persisted price. Checkout still validates supplier quotes. */
export function catalogDisplayPrice(product: { price?: unknown } | null | undefined) {
  const price = Number(product?.price ?? 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}