import { createFileRoute } from "@tanstack/react-router";
import { infiniteQueryOptions, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  Baby, CarFront, ChevronLeft, ChevronRight, Drill, Dumbbell, Files, Gamepad2, Gift, GraduationCap,
  Keyboard, LampDesk, Rocket, ShieldCheck, Shirt, ShoppingBasket, ShoppingCart, Smartphone, Sofa,
  Sparkles, Store, Tag, Truck, Tv, Watch, Zap
} from "lucide-react";
import { useMemo } from "react";

import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/catalog";
import { fetchCatalogPage } from "@/lib/catalog.functions";

type HomeSearch = {
  q?: string | undefined;
  category?: string | undefined;
  range?: "a" | "b" | "c" | "d" | undefined;
  sort?: "price-asc" | "price-desc" | undefined;
  free?: true | undefined;
};

type HomeSearchUpdate = {
  q?: string | undefined;
  category?: string | null | undefined;
  range?: HomeSearch["range"] | "all";
  sort?: HomeSearch["sort"] | "popular";
  free?: boolean | undefined;
};

const normalizeSearch = (search: Record<string, unknown>): HomeSearch => ({
  ...(typeof search["q"] === "string" && search["q"] ? { q: search["q"].slice(0, 100) } : {}),
  ...(typeof search["category"] === "string" && search["category"] ? { category: search["category"] } : {}),
  ...(["a", "b", "c", "d"].includes(String(search["range"])) ? { range: search["range"] as HomeSearch["range"] } : {}),
  ...(["price-asc", "price-desc"].includes(String(search["sort"])) ? { sort: search["sort"] as HomeSearch["sort"] } : {}),
  ...(search["free"] === true || search["free"] === "true" ? { free: true as const } : {}),
});

const resolveSearch = (search: HomeSearch) => ({
  q: search.q ?? "",
  category: search.category ?? null,
  range: search.range ?? "all" as const,
  sort: search.sort ?? "popular" as const,
  free: search.free ?? false,
});

const catalogQueryOptions = (search: HomeSearch) => infiniteQueryOptions({
  queryKey: ["catalog", search],
  queryFn: ({ pageParam }) => {
    const resolved = resolveSearch(search);
    return fetchCatalogPage({ data: {
      page: pageParam,
      pageSize: 48,
      query: resolved.q,
      category: resolved.category,
      range: resolved.range,
      sort: resolved.sort,
      onlyFreeShipping: resolved.free,
    } });
  },
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  validateSearch: normalizeSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureInfiniteQueryData(catalogQueryOptions(deps)),
  head: () => ({
    meta: [
      { title: "HS Digital · Marketplace de produtos e soluções digitais" },
      { name: "description", content: "Ofertas imperdíveis com envio rápido. Milhares de produtos nacionais e importados com frete grátis e compra protegida." },
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

export function Home() {
  const routeSearch = Route.useSearch();
  const search = resolveSearch(routeSearch);
  const navigate = Route.useNavigate();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(catalogQueryOptions(routeSearch));
  const products = data.pages.flatMap((page) => page.products);
  const total = data.pages[0]?.total ?? 0;
  const setSearch = (changes: HomeSearchUpdate) => navigate({
    search: (previous) => {
      const next = { ...previous, ...changes } as Record<string, unknown>;
      if (!next["q"]) delete next["q"];
      if (!next["category"]) delete next["category"];
      if (next["range"] === "all") delete next["range"];
      if (next["sort"] === "popular") delete next["sort"];
      if (!next["free"]) delete next["free"];
      return next as HomeSearch;
    },
  });

  // Ofertas imperdíveis
  const promoProducts = useMemo(() => {
    return products.filter((p) => (p.compare_at_price && p.compare_at_price > p.price) || (p.sold_count ?? 0) > 10);
  }, [products]);

  // Produtos com frete grátis
  const freeShippingProducts = useMemo(() => {
    return products.filter((p) => p.free_shipping || Number(p.price) >= 79);
  }, [products]);

  // Filtro principal da vitrine com suporte à aba de Frete Grátis
  const filtered = useMemo(() => {
    const selectedRange = PRICE_RANGES.find((item) => item.id === search.range) ?? {
      id: "all", label: "Todos os preços", min: 0, max: Infinity,
    };
    const result = products.filter((product) => {
      const price = Number(product.price);
      return price >= selectedRange.min && price <= selectedRange.max;
    });

    return [...result].sort((a, b) => {
      if (search.sort === "price-asc") return Number(a.price) - Number(b.price);
      if (search.sort === "price-desc") return Number(b.price) - Number(a.price);
      return (b.sold_count ?? 0) - (a.sold_count ?? 0);
    });
  }, [products, search.range, search.sort]);

  const categoryLabel = search.free 
    ? "Produtos com Frete Grátis" 
    : search.category 
    ? CATEGORIES.find((item) => item.slug === search.category)?.label 
    : "Todas as ofertas";

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900">
      <SiteHeader query={search.q} onQueryChange={(q) => setSearch({ q })} suggestions={products.map((p) => ({ id: p.id, title: p.title, category: CATEGORIES.find((c) => c.slug === p.category)?.label ?? p.category }))} />
      
      <main>
        {/* BANNER PRINCIPAL */}
        <section className="bg-gradient-to-r from-[#2968c8] via-[#3483fa] to-[#1d52a8] text-white">
          <div className="mx-auto flex min-h-[210px] w-full max-w-7xl items-center px-4 py-8 md:min-h-[260px]">
            <div className="relative max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" /> HS Digital Marketplace
              </span>
              <h1 className="mt-3 text-2xl font-black sm:text-4xl md:text-5xl tracking-tight leading-tight">
                Ofertas imperdíveis com envio rápido
              </h1>
              <p className="mt-2 text-sm text-blue-100 sm:text-base md:text-lg">
                Milhares de produtos nacionais e importados com frete grátis e compra protegida.
              </p>
              
              {/* Badge de Primeira Compra */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#00a650] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
                <Gift className="h-4 w-4" />
                <span>FRETE GRÁTIS NA SUA 1ª COMPRA • Use o cupom <strong>PRIMEIRACOMPRA</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* FAIXA DE BENEFÍCIOS */}
        <section className="bg-white border-b shadow-sm">
          <div className="mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl px-4 py-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#3483fa] shrink-0" />
              <span><strong>Frete rápido</strong> em todo o Brasil</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#00a650] shrink-0" />
              <span><strong>Compra Garantida</strong> receba ou seu dinheiro volta</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500 shrink-0" />
              <span><strong>Ofertas diárias</strong> com até 50% OFF</span>
            </div>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-purple-600 shrink-0" />
              <span><strong>Lojas oficiais</strong> nacionais e internacionais</span>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-6 space-y-8">
          
          {/* CATEGORIAS EM CARROSSEL */}
          <section id="categorias" className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Categorias em destaque</h2>
              <Button variant="ghost" size="sm" className="text-xs text-[#3483fa]" onClick={() => setSearch({ category: null, free: false })}>Ver todas</Button>
            </div>
            <Carousel opts={{ align: "start", dragFree: true }} className="px-6">
              <CarouselContent>
                <CarouselItem className="basis-1/4 sm:basis-1/6 lg:basis-1/8">
                  <Button variant={search.category === null && !search.free ? "secondary" : "ghost"} onClick={() => setSearch({ category: null, free: false })} className="h-20 w-full flex-col gap-1.5 p-2">
                    <ShoppingBasket className="h-5 w-5 text-[#3483fa]" />
                    <span className="text-[11px] font-medium text-gray-700">Todas</span>
                  </Button>
                </CarouselItem>
                {CATEGORIES.map((item) => {
                  const Icon = ICONS[item.icon] ?? Smartphone;
                  return (
                    <CarouselItem key={item.slug} className="basis-1/4 sm:basis-1/6 lg:basis-1/8">
                      <Button variant={search.category === item.slug ? "secondary" : "ghost"} onClick={() => setSearch({ category: item.slug, free: false })} className="h-20 w-full flex-col gap-1.5 p-2 text-center">
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

          {/* 1º CARROSSEL COM SETAS: OFERTAS IMPERDÍVEIS */}
          {promoProducts.length > 0 && (
            <section className="rounded-lg bg-white p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-red-50 text-red-600 rounded-md"><Zap className="h-4 w-4" /></span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">Ofertas imperdíveis com envio rápido</h2>
                    <p className="text-xs text-gray-500">Descontos especiais selecionados para você</p>
                  </div>
                </div>
              </div>

              <div className="relative px-6">
                <Carousel opts={{ align: "start", dragFree: true }}>
                  <CarouselContent className="-ml-3">
                    {promoProducts.map((product) => (
                      <CarouselItem key={`promo-${product.id}`} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                        <ProductCard product={product} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-3 bg-white text-gray-700 shadow-md hover:bg-gray-100" />
                  <CarouselNext className="-right-3 bg-white text-gray-700 shadow-md hover:bg-gray-100" />
                </Carousel>
              </div>
            </section>
          )}

          {/* 2º CARROSSEL COM SETAS: PRODUTOS COM FRETE GRÁTIS */}
          {freeShippingProducts.length > 0 && (
            <section className="rounded-lg bg-white p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-green-50 text-[#00a650] rounded-md"><Truck className="h-4 w-4" /></span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">Produtos com frete grátis</h2>
                    <p className="text-xs text-gray-500">Milhares de produtos nacionais e importados sem custo de frete</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearch({ free: true, category: null })}
                  className="text-xs text-[#00a650] border-[#00a650] hover:bg-green-50"
                >
                  Ver todos com frete grátis
                </Button>
              </div>

              <div className="relative px-6">
                <Carousel opts={{ align: "start", dragFree: true }}>
                  <CarouselContent className="-ml-3">
                    {freeShippingProducts.map((product) => (
                      <CarouselItem key={`ship-${product.id}`} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                        <ProductCard product={product} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-3 bg-white text-gray-700 shadow-md hover:bg-gray-100" />
                  <CarouselNext className="-right-3 bg-white text-gray-700 shadow-md hover:bg-gray-100" />
                </Carousel>
              </div>
            </section>
          )}

          {/* CATÁLOGO GERAL COM ABA EXCLUSIVA DE FRETE GRÁTIS */}
          <section id="catalogo">
            {/* Abas e Filtros Rápidos */}
            <div className="flex flex-wrap items-center gap-2 pb-3 mb-4">
              {/* Botão de Aba Exclusiva: Só Frete Grátis */}
              <Button
                size="sm"
                variant={search.free ? "default" : "outline"}
                className={`rounded-full text-xs font-bold gap-1.5 transition-all ${
                  search.free 
                    ? "bg-[#00a650] hover:bg-[#008f45] text-white shadow-sm" 
                    : "bg-white text-[#00a650] border-[#00a650] hover:bg-green-50"
                }`}
                onClick={() => setSearch({ free: !search.free })}
              >
                <Truck className="h-3.5 w-3.5" />
                {search.free ? "✓ Exibindo só Frete Grátis" : "Filtrar: Só Frete Grátis"}
              </Button>

              {PRICE_RANGES.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={search.range === item.id ? "default" : "outline"}
                  className={`rounded-full text-xs shrink-0 ${
                    search.range === item.id ? "bg-[#3483fa] text-white" : "bg-white text-gray-700"
                  }`}
                  onClick={() => setSearch({ range: item.id as HomeSearch["range"] })}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between border-b pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{categoryLabel}</h2>
                <p className="text-xs text-gray-500">{total} produtos disponíveis</p>
              </div>
              <Select value={search.sort} onValueChange={(sort) => setSearch({ sort: sort as HomeSearch["sort"] })}>
                <SelectTrigger className="w-[180px] bg-white text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Mais vendidos</SelectItem>
                  <SelectItem value="price-asc">Menor preço</SelectItem>
                  <SelectItem value="price-desc">Maior preço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
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
            {hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                  {isFetchingNextPage ? "Carregando…" : "Mostrar mais produtos"}
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
