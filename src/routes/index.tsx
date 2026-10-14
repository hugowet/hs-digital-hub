import { createFileRoute, Link } from "@tanstack/react-router";
import { infiniteQueryOptions, useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  Baby,
  CarFront,
  Drill,
  Dumbbell,
  Files,
  Gamepad2,
  Gift,
  GraduationCap,
  Keyboard,
  LampDesk,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Store,
  Truck,
  Tv,
  Watch,
  X,
  Zap,
  Crown,
  Radio,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { IntroAnimation } from "@/components/intro-animation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/catalog";
import { fetchCatalogPage } from "@/lib/catalog.functions";
import { supabase } from "@/integrations/supabase/client";
import { useRadio } from "@/lib/radio-context";

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
  ...(["price-asc", "price-desc"].includes(String(search["sort"]))
    ? { sort: search["sort"] as HomeSearch["sort"] }
    : {}),
  ...(search["free"] === true || search["free"] === "true" ? { free: true as const } : {}),
});

const resolveSearch = (search: HomeSearch) => ({
  q: search.q ?? "",
  category: search.category ?? null,
  range: search.range ?? ("all" as const),
  sort: search.sort ?? ("popular" as const),
  free: search.free ?? false,
});

const catalogQueryOptions = (search: HomeSearch) =>
  infiniteQueryOptions({
    queryKey: ["catalog", search],
    queryFn: ({ pageParam }) => {
      const resolved = resolveSearch(search);
      return fetchCatalogPage({
        data: {
          page: pageParam,
          pageSize: 48,
          query: resolved.q,
          category: resolved.category,
          range: resolved.range,
          sort: resolved.sort,
          onlyFreeShipping: resolved.free,
        },
      });
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
      {
        name: "description",
        content:
          "Ofertas imperdíveis com envio rápido. Milhares de produtos nacionais e importados com frete grátis e compra protegida.",
      },
      { property: "og:title", content: "HS Digital · Marketplace" },
      { property: "og:description", content: "Produtos selecionados, compra rápida e entrega segura na HS Digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const ICONS: Record<string, typeof Smartphone> = {
  Files,
  GraduationCap,
  Watch,
  Keyboard,
  LampDesk,
  Smartphone,
  Shirt,
  Sofa,
  Sparkles,
  Gamepad2,
  Dumbbell,
  Baby,
  ShoppingBasket,
  Tv,
  Drill,
  CarFront,
};

const PRICE_RANGES = [
  { id: "all", label: "Todos os preços", min: 0, max: Infinity },
  { id: "a", label: "Até R$ 50", min: 0, max: 50 },
  { id: "b", label: "R$ 50 a R$ 100", min: 50, max: 100 },
  { id: "c", label: "R$ 100 a R$ 200", min: 100, max: 200 },
  { id: "d", label: "Acima de R$ 200", min: 200, max: Infinity },
];

function RadioNavButton() {
  const { isPlaying, isLocutorSpeaking } = useRadio();

  return (
    <Button 
      asChild 
      className={`relative w-fit font-bold border-none shadow-sm rounded-full transition-all duration-300 ${
        isPlaying
          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/30 shadow-md ring-2 ring-purple-300 ring-offset-1"
          : "bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
      }`}
    >
      <Link to="/radio" className="inline-flex items-center gap-2">
        <span className="relative flex items-center justify-center">
          <Radio className={`h-4 w-4 text-white ${isPlaying ? "animate-pulse" : ""}`} />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </span>
        <span>Rádio HS</span>
        {isPlaying && (
          <span className="flex items-end gap-0.5 h-3 ml-1" aria-hidden="true">
            <span className="w-0.5 bg-white rounded-full animate-bounce h-2" style={{ animationDelay: "0ms" }} />
            <span className="w-0.5 bg-white rounded-full animate-bounce h-3" style={{ animationDelay: "150ms" }} />
            <span className="w-0.5 bg-white rounded-full animate-bounce h-1.5" style={{ animationDelay: "300ms" }} />
          </span>
        )}
        {isLocutorSpeaking && (
          <span className="ml-1 text-[10px] font-black uppercase px-1.5 py-0.5 bg-amber-400 text-amber-950 rounded-full animate-pulse shadow-sm">
            AO VIVO
          </span>
        )}
      </Link>
    </Button>
  );
}

function BuyerGamesPromoLink() {
  const [isBuyer, setIsBuyer] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setIsBuyer(false);
        return;
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const isSeller = roles?.some((item) => item.role === "seller") ?? false;
      const buyerRole = roles?.some((item) => item.role === "buyer") ?? false;
      setIsBuyer(buyerRole && !isSeller);
    });
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {isBuyer && (
        <>
          {/* Botão de Jogos */}
          <Button asChild variant="secondary" className="w-fit shadow-sm rounded-full">
            <Link to="/jogos">
              <Gamepad2 className="h-4 w-4 mr-2" /> Jogos &amp; Prêmios
            </Link>
          </Button>

          {/* Botão do Clube HS */}
          <Button asChild className="w-fit bg-amber-500 hover:bg-amber-600 text-white font-bold border-none shadow-sm rounded-full">
            <Link to="/clube-hs">
              <Crown className="h-4 w-4 mr-2 fill-white" /> Clube HS
            </Link>
          </Button>
        </>
      )}

      {/* 📻 BOTÃO DA RÁDIO HS INTEGRADO DIRETAMENTE (COM INDICADOR ANIMADO / PISCANDO) */}
      <RadioNavButton />
    </div>
  );
}

export function Home() {
  const routeSearch = Route.useSearch();
  const search = resolveSearch(routeSearch);
  const navigate = Route.useNavigate();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    catalogQueryOptions(routeSearch),
  );
  const products = data.pages.flatMap((page) => page.products);

  // Busca dinamicamente apenas as categorias com produtos ativos
  const { data: activeCategories = [] } = useQuery({
    queryKey: ["active-store-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category").eq("is_active", true);
      const uniqueSlugs = Array.from(new Set(data?.map((p) => p.category).filter(Boolean)));

      return uniqueSlugs.map((slug) => {
        const found = CATEGORIES.find((c) => c.slug === slug);
        if (found) return found;
        const formatted = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        return { slug, label: formatted, icon: "ShoppingBasket" };
      });
    },
    staleTime: 5 * 60_000,
  });

  const setSearch = (changes: HomeSearchUpdate) =>
    navigate({
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

  // Filtro estrito: se tiver pesquisa por termo ou categoria, traz estritamente correspondentes
  const filtered = useMemo(() => {
    const selectedRange = PRICE_RANGES.find((item) => item.id === search.range) ?? {
      id: "all",
      label: "Todos os preços",
      min: 0,
      max: Infinity,
    };

    return products
      .filter((product) => {
        if (!search.q) return true;
        const query = search.q.toLowerCase();
        const titleMatch = product.title.toLowerCase().includes(query);
        const descriptionMatch = product.description.toLowerCase().includes(query);
        const categoryMatch = product.category.toLowerCase().includes(query);
        return titleMatch || descriptionMatch || categoryMatch;
      })
      .filter((product) => (search.category ? product.category === search.category : true))
      .filter((product) => {
        const effectivePrice = product.promotional_price ?? product.price;
        return effectivePrice >= selectedRange.min && effectivePrice <= selectedRange.max;
      })
      .filter((product) => (search.free ? product.free_shipping : true))
      .sort((a, b) => {
        const priceA = a.promotional_price ?? a.price;
        const priceB = b.promotional_price ?? b.price;

        if (search.sort === "price-asc") return priceA - priceB;
        if (search.sort === "price-desc") return priceB - priceA;
        return 0;
      });
  }, [products, search]);

  const activeCategory = activeCategories.find((category) => category.slug === search.category);
  const activeRange = PRICE_RANGES.find((item) => item.id === search.range);
  const hasActiveFilters = Boolean(search.category || search.range !== "all" || search.sort !== "popular" || search.free);
  const hasSearchQuery = Boolean(search.q || search.category);

  const suggestions = useMemo(() => {
    return products.slice(0, 50).map((p) => ({
      id: p.id,
      title: p.title,
      category: activeCategories.find((c) => c.slug === p.category)?.label ?? p.category ?? "Geral",
    }));
  }, [products, activeCategories]);

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900">
      <IntroAnimation />
      <SiteHeader query={search.q} onQueryChange={(q) => setSearch({ q })} suggestions={suggestions} />

      <main>
        {/* BANNER PRINCIPAL (Exibido apenas na tela inicial geral) */}
        {!hasSearchQuery && (
          <>
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

                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#00a650] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
                    <Gift className="h-4 w-4" />
                    <span>FRETE GRÁTIS AUTOMÁTICO NA SUA 1ª COMPRA</span>
                  </div>
                  <div>
                    <BuyerGamesPromoLink />
                  </div>
                </div>
              </div>
            </section>

            {/* FAIXA DE BENEFÍCIOS */}
            <section className="bg-white border-b shadow-sm">
              <div className="mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl px-4 py-3 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#3483fa] shrink-0" />
                  <span>
                    <strong>Frete rápido</strong> em todo o Brasil
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#3483fa] shrink-0" />
                  <span>
                    <strong>Compra Protegida</strong> e segura
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#3483fa] shrink-0" />
                  <span>
                    <strong>Super Ofertas</strong> atualizadas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-[#3483fa] shrink-0" />
                  <span>
                    <strong>Vendedores</strong> verificados
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* CARROSSEL / LISTA DE CATEGORIAS */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Categorias em Destaque
              </h2>
              {search.category && (
                <button
                  type="button"
                  onClick={() => setSearch({ category: null })}
                  className="text-xs text-[#3483fa] font-semibold hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Ver todas as categorias
                </button>
              )}
            </div>

            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
              <button
                type="button"
                onClick={() => setSearch({ category: null })}
                className={`flex shrink-0 flex-col items-center justify-center rounded-xl p-3 w-20 sm:w-24 border text-center transition-all ${
                  !search.category
                    ? "border-[#3483fa] bg-white text-[#3483fa] shadow-sm ring-1 ring-[#3483fa]"
                    : "border-transparent bg-white text-gray-700 hover:border-gray-200 hover:shadow-sm"
                }`}
              >
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-50 text-[#3483fa] mb-2">
                  <ShoppingBasket className="h-5 w-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold leading-tight line-clamp-1">Todas</span>
              </button>

              {activeCategories.map((category) => {
                const Icon = ICONS[category.icon] ?? ShoppingBasket;
                const isSelected = search.category === category.slug;
                return (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => setSearch({ category: isSelected ? null : category.slug })}
                    className={`flex shrink-0 flex-col items-center justify-center rounded-xl p-3 w-20 sm:w-24 border text-center transition-all ${
                      isSelected
                        ? "border-[#3483fa] bg-white text-[#3483fa] shadow-sm ring-1 ring-[#3483fa]"
                        : "border-transparent bg-white text-gray-700 hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full mb-2 ${
                        isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold leading-tight line-clamp-1">
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* PRODUTOS E FILTROS */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/80 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {hasSearchQuery ? (
                    <>
                      Resultados para{" "}
                      <span className="text-[#3483fa]">
                        {search.q ? `"${search.q}"` : activeCategory?.label}
                      </span>
                    </>
                  ) : (
                    "Ofertas do Dia"
                  )}
                </h3>
                <p className="text-xs text-gray-500">
                  {filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}
                </p>
              </div>

              {/* FILTROS RÁPIDOS */}
              <div className="flex flex-wrap items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch({ category: null, range: "all", sort: "popular", free: false })}
                    className="h-9 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Limpar filtros
                  </Button>
                )}

                <Select value={search.range} onValueChange={(val) => setSearch({ range: val as any })}>
                  <SelectTrigger className="h-9 text-xs w-[140px] bg-white">
                    <SelectValue placeholder="Faixa de preço" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_RANGES.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-xs">
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={search.sort} onValueChange={(val) => setSearch({ sort: val as any })}>
                  <SelectTrigger className="h-9 text-xs w-[140px] bg-white">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular" className="text-xs">Mais populares</SelectItem>
                    <SelectItem value="price-asc" className="text-xs">Menor preço</SelectItem>
                    <SelectItem value="price-desc" className="text-xs">Maior preço</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => setSearch({ free: !search.free })}
                  className={`h-9 px-3 rounded-md border text-xs font-semibold transition flex items-center gap-1.5 ${
                    search.free
                      ? "bg-[#00a650] text-white border-[#00a650] shadow"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Truck className="h-3.5 w-3.5" /> Frete Grátis
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <p className="text-base font-bold text-gray-700">
                  Nenhum produto encontrado para {hasSearchQuery ? `"${search.q}"` : "esta categoria"}.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Confira a ortografia ou tente pesquisar por outro termo.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs font-semibold"
                  onClick={() => setSearch({ category: null, q: "", free: false })}
                >
                  Limpar busca e ver todas as ofertas
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {hasNextPage && (
              <div className="flex justify-center pt-6">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="bg-[#3483fa] hover:bg-[#2968c8] text-white px-8"
                >
                  {isFetchingNextPage ? "Carregando mais produtos..." : "Carregar mais ofertas"}
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
