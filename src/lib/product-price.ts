/** Catalog and detail deliberately use the same persisted price. Checkout still validates supplier quotes. */
export function catalogDisplayPrice(product: { price?: unknown } | null | undefined) {
  const price = Number(product?.price ?? 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

/** Cart entry depends on available stock, not an asynchronous shipping quote.
 * Checkout remains responsible for confirming the destination-specific total. */
export function canAddProductToCart(product: { stock?: unknown } | null | undefined, quantity = 1) {
  const stock = Number(product?.stock);
  return Number.isFinite(stock) && stock > 0 && Number.isInteger(quantity) && quantity > 0 && stock >= quantity;
}