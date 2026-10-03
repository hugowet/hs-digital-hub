import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Baby, CarFront, ChevronLeft, ChevronRight, Drill, Dumbbell, Files, Gamepad2, Gift, GraduationCap, Headphones, Keyboard,
  LampDesk, Rocket, ShieldCheck, Shirt, ShoppingBasket, ShoppingCart, Smartphone, Sofa, Sparkles,
  Store, Truck, Tv, Watch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/catalog";
import { fetchProducts } from "@/lib/catalog.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HS Digital · Marketplace de produtos e soluções digitais" },
      { name: "description", content: "Encontre produtos digitais, cursos, tecnologia e acessórios na HS Digital." },
      { property: "og:title", content: "HS Digital · Marketplace" },
      { property: "og:description", content: "Produtos selecionados, compra rápida e entrega segura na HS Digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const ICONS: Record<string, typeof Smartphone> = {
  Files, GraduationCap, Watch, Keyboard, LampDesk, Smartphone, Shirt, Sofa,
  Sparkles, Gamepad2, Dumbbell, Baby, ShoppingBasket, Tv, Drill, CarFront,
};

const PRICE_RANGES = [
  { id: "all", label: "Todos os preços", min: 0, max: Infinity },
  { id: "a", label: "Até R$ 50", min: 0, max: 50 },
  { id: "b", label: "R$ 50 a R$ 100", min: 50, max: 100 },
  { id: "c", label: "R$ 100 a R$ 200", min: 100, max: 200 },
  { id: "d", label: "Acima de R$ 200", min: 200, max: Infinity },
];

const PROMOTIONS = [
  { icon: Gift, eyebrow: "Ofertas da semana", title: "Promoções especiais em produtos selecionados", action: "Ver ofertas", target: "catalogo" },
  { icon: Truck, eyebrow: "Economize na entrega", title: "Frete grátis nos produtos participantes", action: "Explorar agora", target: "catalogo" },
  { icon: Rocket, eyebrow: "Missões HS", title: "Complete missões e aproveite novas oportunidades", action: "Começar missão", target: "categorias" },
  { icon: Store, eyebrow: "Venda na HS Digital", title: "Cadastre sua loja e publique seus primeiros produtos", action: "Quero vender", target: "vendedor" },
  { icon: ShoppingCart, eyebrow: "Primeira compra", title: "Encontre seu primeiro produto com compra protegida", action: "Comprar agora", target: "catalogo" },
] as const;

function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("popular");
  const [promotionIndex, setPromotionIndex] = useState(0);
  const { data: products = [], isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  useEffect(() => {
    const timer = window.setInterval(() => setPromotionIndex((current) => (current + 1) % PROMOTIONS.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const selectedRange = PRICE_RANGES.find((item) => item.id === range) ?? {
      id: "all", label: "Todos os preços", min: 0, max: Infinity,
    };
    const result = products.filter((product) => {
      const price = Number(product.price);
      const search = `${product.title} ${product.stores?.name ?? ""} ${product.category}`.toLowerCase();
      return search.includes(query.trim().toLowerCase()) && (!category || product.category === category)
        && price >= selectedRange.min && price <= selectedRange.max;
    });
    return [...result].sort((a, b) => sort === "price-asc"
      ? Number(a.price) - Number(b.price)
      : sort === "price-desc" ? Number(b.price) - Number(a.price) : b.sold_count - a.sold_count);
  }, [products, query, category, range, sort]);

  const categoryLabel = category ? CATEGORIES.find((item) => item.slug === category)?.label : "Todas as ofertas";
  const promotion = PROMOTIONS[promotionIndex] ?? PROMOTIONS[0];
  const PromotionIcon = promotion.icon;

  function movePromotion(direction: number) {
    setPromotionIndex((current) => (current + direction + PROMOTIONS.length) % PROMOTIONS.length);
  }

  function followPromotion() {
    if (promotion.target === "vendedor") {
      window.location.assign("/vendedor");
      return;
    }
    document.getElementById(promotion.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[#ebebeb]">
      <SiteHeader query={query} onQueryChange={setQuery} suggestions={products.map((p) => ({ id: p.id, title: p.title, category: CATEGORIES.find((c) => c.slug === p.category)?.label ?? p.category }))} />
      <main>
        {/* Banner principal */}
        <section className="brand-gradient relative overflow-hidden text-primary-foreground">
          <div className="mx-auto flex min-h-[220px] w-full max-w-7xl items-center px-4 py-8 md:min-h-[280px]">
            <div className="relative max-w-3xl">
              <span className="inline-block rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">HS Digital Marketplace</span>
              <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">Ofertas imperdíveis com envio rápido</h1>
              <p className="mt-2 text-sm text-primary-foreground/80 md:text-base">Milhares de produtos nacionais e importados com frete grátis e compra protegida.</p>
            </div>
          </div>
        </section>

        {/* Faixa de Destaques Mercado Livre */}
        <section className="bg-white border-b shadow-sm">
          <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-[#3483fa]"><PromotionIcon className="h-5 w-5" /></span>
              <div>
                <p className="text-[11px] font-bold uppercase text-[#00a650]">{promotion.eyebrow}</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-800">{promotion.title}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-xs text-[#3483fa] border-[#3483fa]" onClick={followPromotion}>{promotion.action}</Button>
          </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-4 py-6">
          {/* Categorias em carrossel */}
          <section id="categorias" className="rounded-lg bg-white p-4 shadow-sm mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Categorias em destaque</h2>
              <Button variant="ghost" size="sm" className="text-xs text-[#3483fa]" onClick={() => setCategory(null)}>Ver todas</Button>
            </div>
            <Carousel opts={{ align: "start", dragFree: true }} className="px-6">
              <CarouselContent>
                <CarouselItem className="basis-1/4 sm:basis-1/6 lg:basis-1/8">
                  <Button variant={category === null ? "secondary" : "ghost"} onClick={() => setCategory(null)} className="h-20 w-full flex-col gap-1.5 p-2">
                    <ShoppingBasket className="h-5 w-5 text-[#3483fa]" />
                    <span className="text-[11px] font-medium text-gray-700">Todas</span>
                  </Button>
                </CarouselItem>
                {CATEGORIES.map((item) => {
                  const Icon = ICONS[item.icon] ?? Smartphone;
                  return (
                    <CarouselItem key={item.slug} className="basis-1/4 sm:basis-1/6 lg:basis-1/8">
                      <Button variant={category === item.slug ? "secondary" : "ghost"} onClick={() => setCategory(item.slug)} className="h-20 w-full flex-col gap-1.5 p-2 text-center">
                        <Icon className="h-5 w-5 text-[#3483fa]" />
                        <span className="line-clamp-1 text-[11px] font-medium text-gray-700">{item.label}</span>
                      </Button>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="-left-3" />
              <CarouselNext className="-right-3" />
            </Carousel>
          </section>

          {/* Filtros de Preço */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            {PRICE_RANGES.map((item) => (
              <Button key={item.id} size="sm" variant={range === item.id ? "default" : "outline"} className={`rounded-full text-xs shrink-0 ${range === item.id ? "bg-[#3483fa] text-white" : "bg-white text-gray-700"}`} onClick={() => setRange(item.id)}>
                {item.label}
              </Button>
            ))}
          </div>

          {/* Grade da Vitrine: 2 no celular, 3/4 no tablet e 6 no computador */}
          <section id="catalogo">
            <div className="flex flex-wrap items-center justify-between border-b pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{categoryLabel}</h2>
                <p className="text-xs text-gray-500">{filtered.length} produtos disponíveis</p>
              </div>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[180px] bg-white text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Mais vendidos</SelectItem>
                  <SelectItem value="price-asc">Menor preço</SelectItem>
                  <SelectItem value="price-desc">Maior preço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-72 rounded-lg bg-white p-3 shadow-sm animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
                Nenhum produto encontrado para este filtro.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
