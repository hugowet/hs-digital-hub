import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  title: string;
  price: number;
  imageUrl: string | null;
  storeId: string;
  storeName: string;
  freeShipping: boolean;
  quantity: number;
};

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* carrinho vazio */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignora quota */
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      add: (item, quantity = 1) =>
        setItems((prev) => {
          const found = prev.find((i) => i.productId === item.productId);
          if (found) {
            return prev.map((i) =>
              i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i,
            );
          }
          return [...prev, { ...item, quantity }];
        }),
      setQuantity: (productId, quantity) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
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
