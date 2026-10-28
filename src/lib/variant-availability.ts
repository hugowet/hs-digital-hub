export function isPurchasableVariant(option: { id?: string; productId?: string; stock: unknown; is_active?: boolean }) {
  return Boolean(option.id || option.productId) && option.is_active !== false && Number.isFinite(Number(option.stock)) && Number(option.stock) > 0;
}