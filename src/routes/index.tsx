import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Baby, Dumbbell, Files, Gamepad2, GraduationCap, Headphones, Keyboard,
  LampDesk, ShieldCheck, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles,
  Truck, Watch,
} from "lucide-react";
import { useMemo, useState } from "react";

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
  Sparkles, Gamepad2, Dumbbell, Baby, ShoppingBasket,
};

const PRICE_RANGES = [
  { id: "all", label: "Todos os preços", min: 0, max: Infinity },
  { id: "a", label: "Até R$ 50", min: 0, max: 50 },
  { id: "b", label: "R$ 50 a R$ 100", min: 50, max: 100 },
  { id: "c", label: "R$ 100 a R$ 200", min: 100, max: 200 },
  { id: "d", label: "Acima de R$ 200", min: 200, max: Infinity },
];

function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("popular");
  const { data: products = [], isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader query={query} onQueryChange={setQuery} suggestions={products.map((p) => ({ id: p.id, title: p.title, category: CATEGORIES.find((c) => c.slug === p.category)?.label ?? p.category }))} />
      <main>
        <section className="brand-gradient overflow-hidden text-primary-foreground">
          <div className="mx-auto flex min-h-[250px] w-full max-w-7xl items-center px-4 py-10 md:min-h-[330px]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-primary-glow">Seu marketplace, mais inteligente</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">HS Digital Marketplace</h1>
              <p className="mt-4 max-w-2xl text-sm text-primary-foreground/75 md:text-lg">Produtos digitais, tecnologia e soluções selecionadas para transformar sua rotina.</p>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-4 pb-10">
          <section className="grid gap-3 py-5 sm:grid-cols-3">
            {[
              { icon: Truck, title: "Entrega rápida", text: "Agilidade em produtos selecionados" },
              { icon: ShieldCheck, title: "Compra protegida", text: "Pedido conferido antes do pagamento" },
              { icon: Headphones, title: "Suporte próximo", text: "Atendimento quando você precisar" },
            ].map((item) => <div key={item.title} className="flex items-center gap-3 border-b border-border py-3"><item.icon className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.text}</p></div></div>)}
          </section>

          <section className="pt-3">
            <div className="border-y border-border py-5">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Explore por categoria</h2><Button variant="ghost" size="sm" onClick={() => setCategory(null)}>Ver todas</Button></div>
              <Carousel opts={{ align: "start", dragFree: true }} className="px-9">
                <CarouselContent>
                  <CarouselItem className="basis-1/3 sm:basis-1/4 lg:basis-1/7"><Button variant={category === null ? "secondary" : "ghost"} onClick={() => setCategory(null)} className="h-24 w-full flex-col gap-2 whitespace-normal"><ShoppingBasket className="h-5 w-5" /><span className="text-xs">Todas</span></Button></CarouselItem>
                  {CATEGORIES.map((item) => { const Icon = ICONS[item.icon] ?? Smartphone; return <CarouselItem key={item.slug} className="basis-1/3 sm:basis-1/4 lg:basis-1/7"><Button variant={category === item.slug ? "secondary" : "ghost"} onClick={() => setCategory(item.slug)} className="h-24 w-full flex-col gap-2 whitespace-normal px-2 text-center"><Icon className="h-5 w-5" /><span className="line-clamp-2 text-xs">{item.label}</span></Button></CarouselItem>; })}
                </CarouselContent>
                <CarouselPrevious className="left-0" /><CarouselNext className="right-0" />
              </Carousel>
            </div>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Faixa de preço">{PRICE_RANGES.map((item) => <Button key={item.id} size="sm" variant={range === item.id ? "secondary" : "outline"} className="shrink-0" onClick={() => setRange(item.id)}>{item.label}</Button>)}</div>
            <div className="mt-4 min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
                <div><h2 className="text-xl font-bold">{categoryLabel}</h2><p className="text-sm text-muted-foreground">{filtered.length} produtos encontrados</p></div>
                <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-[190px]" aria-label="Ordenar produtos"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="popular">Mais vendidos</SelectItem><SelectItem value="price-asc">Menor preço</SelectItem><SelectItem value="price-desc">Maior preço</SelectItem></SelectContent></Select>
              </div>
              {isLoading ? <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3"><div className="surface-card h-80 animate-pulse bg-muted" /><div className="surface-card h-80 animate-pulse bg-muted" /></div>
              : filtered.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">Nenhum produto encontrado para esta busca.</p>
              : <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}