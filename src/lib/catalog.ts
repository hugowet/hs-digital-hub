import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  category: string;
  image_url: string | null;
  free_shipping: boolean;
  rating: number;
  reviews_count: number;
  sold_count: number;
  store_id: string;
  stores: { name: string; slug: string } | null;
};

export const CATEGORIES = [
  { slug: "eletronicos", label: "Eletrônicos", icon: "Smartphone" },
  { slug: "moda", label: "Moda", icon: "Shirt" },
  { slug: "casa", label: "Casa", icon: "Sofa" },
  { slug: "beleza", label: "Beleza", icon: "Sparkles" },
  { slug: "games", label: "Games", icon: "Gamepad2" },
  { slug: "esportes", label: "Esportes", icon: "Dumbbell" },
  { slug: "infantil", label: "Infantil", icon: "Baby" },
  { slug: "mercado", label: "Mercado", icon: "ShoppingBasket" },
] as const;

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,title,price,compare_at_price,stock,category,image_url,free_shipping,rating,reviews_count,sold_count,store_id,stores(name,slug)",
    )
    .eq("is_active", true)
    .order("sold_count", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function fetchCommissionRate(): Promise<number> {
  const { data } = await supabase.from("platform_settings").select("commission_rate").maybeSingle();
  return Number(data?.commission_rate ?? 0.12);
}
