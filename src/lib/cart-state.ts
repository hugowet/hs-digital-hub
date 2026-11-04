export type CartItem = {
  productId: string;
  title: string;
  price: number;
  imageUrl: string | null;
  storeId: string;
  storeName: string;
  freeShipping: boolean;
  productType: string;
  stock: number;
  quantity: number;
  supplier?: string | null;
  compareAtPrice?: number | null;
  quotedPostalCode?: string;
  quotedExpiresAt?: string;
  quotedShipping?: number;
  choice?: string;
};

export function restoreCart(raw: string | null): CartItem[] {
  try {
    const rows: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is CartItem => Boolean(row && typeof row === "object"
      && typeof row.productId === "string" && typeof row.storeId === "string"
      && typeof row.title === "string" && typeof row.storeName === "string"
      && Number.isFinite(row.price) && row.price >= 0
      && Number.isInteger(row.quantity) && row.quantity > 0))
      .map((row) => ({ ...row, stock: Number.isFinite(row.stock) ? Math.max(0, row.stock) : 99,
        productType: row.productType ?? "physical" }));
  } catch {
    return [];
  }
}

export function mergeCartItem(items: CartItem[], item: Omit<CartItem, "quantity">, quantity: number): CartItem[] {
  const found = items.find((row) => row.productId === item.productId);
  // A single product row carries one supplier choice; changing it must not
  // silently transfer quantities purchased for the previous color/size.
  const sameChoice = found?.choice === item.choice;
  const nextQuantity = Math.min((sameChoice ? found?.quantity ?? 0 : 0) + quantity, item.stock);
  if (nextQuantity <= 0) return items;
  if (!found) return [...items, { ...item, quantity: nextQuantity }];
  return items.map((row) => row.productId === item.productId ? { ...row, ...item, quantity: nextQuantity } : row);
}