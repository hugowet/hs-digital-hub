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
  // An add that carries no choice (product card) keeps the row's existing
  // choice and adds to its quantity instead of replacing it.
  const sameChoice = !found?.choice || !item.choice || found.choice === item.choice;
  const nextQuantity = Math.min((sameChoice ? found?.quantity ?? 0 : 0) + quantity, item.stock);
  if (nextQuantity <= 0) return items;
  if (!found) return [...items, { ...item, quantity: nextQuantity }];
  return items.map((row) => {
    if (row.productId !== item.productId) return row;
    const merged: CartItem = { ...row, ...item, choice: item.choice ?? row.choice, quantity: nextQuantity };
    // The card line carries no choice, so it must not rewrite the color/size
    // the product page recorded in the title (the only place it is shown).
    if (!item.choice && row.choice) merged.title = row.title;
    return merged;
  });
}