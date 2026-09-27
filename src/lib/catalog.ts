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
  description: string | null;
  description_long: string | null;
  gallery_urls: string[];
  specifications: Record<string, string>;
  variations: Array<{ name: string; options: string[] }>;
  product_type: string;
};

export const CATEGORIES = [
  { slug: "digitais-templates", label: "Digitais & Templates", icon: "Files" },
  { slug: "cursos-infoprodutos", label: "Cursos & Infoprodutos", icon: "GraduationCap" },
  { slug: "eletronicos-gadgets", label: "Eletrônicos & Gadgets", icon: "Watch" },
  { slug: "perifericos-acessorios", label: "Periféricos & Acessórios", icon: "Keyboard" },
  { slug: "casa-setup", label: "Casa & Setup", icon: "LampDesk" },
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
      "id,title,description,description_long,price,compare_at_price,stock,category,image_url,gallery_urls,specifications,variations,free_shipping,rating,reviews_count,sold_count,store_id,product_type,stores(name,slug)",
    )
    .eq("is_active", true)
    .order("sold_count", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function fetchProduct(productId: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,title,description,description_long,price,compare_at_price,stock,category,image_url,gallery_urls,specifications,variations,free_shipping,rating,reviews_count,sold_count,store_id,product_type,stores(name,slug)",
    )
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Product | null;
}

export async function fetchCommissionRate(): Promise<number> {
  const { data } = await supabase.from("platform_settings").select("commission_rate").maybeSingle();
  return Number(data?.commission_rate ?? 0.12);
}
