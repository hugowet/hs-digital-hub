export type ProductMedia = {
  id: string;
  storage_path: string;
  media_type: "image" | "video";
  mime_type: string;
  position: number;
  url: string;
};

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
  supplier: string | null;
  media?: ProductMedia[];
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

