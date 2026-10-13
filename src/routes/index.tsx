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

/**
 * 3 Botões redondos alinhados embaixo do frete grátis:
 * [Jogos & Prêmios] [Clube HS] [Rádio HS]
 */
function PromoButtonsRow() {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {/* 1. Jogos & Prêmios */}
      <Button asChild variant="secondary" className="w-fit shadow-sm rounded-full">
        <Link to="/jogos">
          <Gamepad2 className="h-4 w-4 mr-2" /> Jogos &amp; Prêmios
        </Link>
      </Button>

      {/* 2. Clube HS */}
      <Button asChild className="w-fit bg-amber-500 hover:bg-amber-600 text-white font-bold border-none shadow-sm rounded-full">
        <Link to="/clube-hs">
          <Crown className="h-4 w-4 mr-2 fill-white" /> Clube HS
        </Link>
      </Button>

      {/* 3. Rádio HS (ao lado direito do Clube HS, escuro elegante, rounded-full) */}
      <Button asChild className="w-fit bg-slate-900 hover:bg-slate-800 text-white font-medium border border-slate-700/60 shadow-sm rounded-full">
        <Link to="/radio">
          <span className="mr-2 text-base">🎵</span> Rádio HS
        </Link>
      </Button>
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

  const searchSuggestions = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
      })),
    [products],
  );

  const updateSearch = (patch: HomeSearchUpdate) => {
    navigate({
      search: (prev) => {
        const next: HomeSearch = { ...prev };

        if ("q" in patch) {
          if (patch.q) next.q = patch.q;
          else delete next.q;
        }

        if ("category" in patch) {
          if (patch.category) next.category = patch.category;
          else delete next.category;
        }

        if ("range" in patch) {
          if (patch.range && patch.range !== "all") next.range = patch.range;
          else delete next.range;
        }

        if ("sort" in patch) {
          if (patch.sort && patch.sort !== "popular") next.sort = patch.sort;
          else delete next.sort;
        }

        if ("free" in patch) {
          if (patch.free) next.free = true;
          else delete next.free;
        }

        return next;
      },
      resetScroll: false,
    });
  };

  const clearAllFilters = () => {
    navigate({
      search: {},
      resetScroll: false,
    });
  };

  const hasActiveFilters = Boolean(
    search.q || search.category || search.range !== "all" || search.sort !== "popular" || search.free,
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <IntroAnimation />

      <SiteHeader
        query={search.q}
        onQueryChange={(q) => updateSearch({ q })}
        suggestions={searchSuggestions}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Banner de Destaque estilo Mercado Livre */}
        {!hasActiveFilters && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 p-6 md:p-10 shadow-sm border border-amber-200/60">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/10 text-slate-900 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Semana do Consumidor
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                As melhores ofertas com <span className="underline decoration-slate-900/30">entrega garantida</span> e segura.
              </h1>
              <p className="text-slate-700 text-sm md:text-base font-medium">
                Compre no Pix com aprovação imediata ou parcele suas compras no cartão de crédito.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-[#00a650] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm w-fit">
                  <Gift className="h-4 w-4" />
                  <span>FRETE GRÁTIS AUTOMÁTICO NA SUA 1ª COMPRA</span>
                </div>

                {/* Fileira com os 3 botões redondos [Jogos & Prêmios] [Clube HS] [Rádio HS] */}
                <PromoButtonsRow />
              </div>
            </div>

            <div className="absolute right-4 -bottom-10 opacity-10 md:opacity-20 pointer-events-none">
              <ShoppingBasket className="w-80 h-80 text-slate-900" />
            </div>
          </div>
        )}

        {/* Categorias com ícones */}
        {activeCategories.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Categorias em destaque</h2>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => updateSearch({ category: null })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[80px] text-xs font-semibold transition-all border ${
                  !search.category
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Store className="w-5 h-5 mb-1.5" />
                <span>Todas</span>
              </button>

              {activeCategories.map((cat) => {
                const Icon = (cat.icon && ICONS[cat.icon]) || ShoppingBasket;
                const active = search.category === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => updateSearch({ category: active ? null : cat.slug })}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[90px] text-xs font-semibold transition-all border ${
                      active
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="truncate max-w-[80px]">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Barra de Filtros e Ordenação */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => updateSearch({ free: !search.free })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                search.free
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Truck className="w-3.5 h-3.5" /> Frete Grátis
            </button>

            <Select
              value={search.range}
              onValueChange={(val) => updateSearch({ range: val as HomeSearchUpdate["range"] })}
            >
              <SelectTrigger className="h-8 text-xs rounded-full border-slate-200 bg-slate-50 w-[140px]">
                <SelectValue placeholder="Faixa de Preço" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
              >
                <X className="w-3.5 h-3.5" /> Limpar Filtros
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Ordenar por:</span>
            <Select
              value={search.sort}
              onValueChange={(val) => updateSearch({ sort: val as HomeSearchUpdate["sort"] })}
            >
              <SelectTrigger className="h-8 text-xs rounded-full border-slate-200 bg-slate-50 w-[150px]">
                <SelectValue placeholder="Mais Populares" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular" className="text-xs">
                  Mais Populares
                </SelectItem>
                <SelectItem value="price-asc" className="text-xs">
                  Menor Preço
                </SelectItem>
                <SelectItem value="price-desc" className="text-xs">
                  Maior Preço
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grade de Produtos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              {search.category
                ? `Produtos em ${activeCategories.find((c) => c.slug === search.category)?.label || search.category}`
                : search.q
                  ? `Resultados para "${search.q}"`
                  : "Todos os Produtos"}
            </h2>
            <span className="text-xs text-slate-400 font-medium">{products.length} itens encontrados</span>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-3">
              <ShoppingBasket className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Nenhum produto encontrado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tente ajustar os filtros ou remover termos da pesquisa para ver mais opções.
              </p>
              <Button onClick={clearAllFilters} variant="outline" size="sm" className="rounded-full">
                Ver todos os produtos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div className="text-center pt-6">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
                className="rounded-full px-8 bg-white shadow-xs font-semibold"
              >
                {isFetchingNextPage ? "Carregando mais..." : "Carregar mais produtos"}
              </Button>
            </div>
          )}
        </section>

        {/* Benefícios Mercado Livre Style */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200/60">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Pagamento Imediato</h4>
              <p className="text-[11px] text-slate-500">Pague no Pix com aprovação instantânea.</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Envio Rápido e Seguro</h4>
              <p className="text-[11px] text-slate-500">Rastreie seu pedido direto pelo painel.</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Compra 100% Protegida</h4>
              <p className="text-[11px] text-slate-500">Garantia total de recebimento ou reembolso.</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
