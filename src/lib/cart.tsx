import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { mergeCartItem, restoreCart, type CartItem } from "./cart-state";
export type { CartItem } from "./cart-state";

type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const STORAGE_KEY = "hs-digital-cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      setItems(restoreCart(localStorage.getItem(STORAGE_KEY)));
    } catch {
      /* carrinho vazio */
    } finally {
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignora quota */
    }
  }, [items, restored]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      add: (item, quantity = 1) => {
        setItems((prev) => mergeCartItem(prev, item, quantity));
        toast.success("Adicionado ao carrinho");
      },
      setQuantity: (productId, quantity) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) =>
                i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stock) } : i,
              ),
        ),
      remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}

/** Agrupa o carrinho por loja (carrinho multi-loja estilo Shopee). */
export function groupByStore(items: CartItem[]) {
  const map = new Map<
    string,
    { storeId: string; storeName: string; items: CartItem[]; subtotal: number }
  >();
  for (const item of items) {
    const group = map.get(item.storeId) ?? {
      storeId: item.storeId,
      storeName: item.storeName,
      items: [],
      subtotal: 0,
    };
    group.items.push(item);
    group.subtotal += item.price * item.quantity;
    map.set(item.storeId, group);
  }
  return [...map.values()];
}
