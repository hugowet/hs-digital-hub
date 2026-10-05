import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  // Identifica o usuário logado para isolar os carrinhos
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? "convidado");
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? "convidado");
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Carrega o carrinho exclusivo do usuário conectado
  useEffect(() => {
    if (!userId) return;
    const storageKey = `hs-digital-cart_${userId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<CartItem & { stock?: number }>;
        setItems(
          parsed.map((item) => ({
            ...item,
            stock: Number.isFinite(item.stock) ? Number(item.stock) : 99,
            productType: item.productType ?? "physical",
          })),
        );
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  }, [userId]);

  // Salva alterações no carrinho exclusivo deste usuário
  useEffect(() => {
    if (!userId) return;
    const storageKey = `hs-digital-cart_${userId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /* ignora erro de cota */
    }
  }, [items, userId]);

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
              i.productId === item.productId ? { ...i, quantity: Math.min(i.quantity + quantity, i.stock) } : i,
            );
          }
          return [...prev, { ...item, quantity }];
        }),
      setQuantity: (productId, quantity) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stock) } : i)),
        ),
      remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
      clear: () => {
        setItems([]);
        if (userId) {
          localStorage.removeItem(`hs-digital-cart_${userId}`);
        }
      },
    };
  }, [items, userId]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}

export function groupByStore(items: CartItem[]) {
  const map = new Map<string, { storeId: string; storeName: string; items: CartItem[]; subtotal: number }>();
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
