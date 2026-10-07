import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

export function Home() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    catalogQueryOptions(search),
  );

  const { data: activeCategories = [] } = useQuery({
    queryKey: ["active_categories_with_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("status", "active")
        .limit(1000);
      if (error) return [];
      const distinct = Array.from(new Set((data || []).map((p) => p.category).filter(Boolean)));
      return distinct;
    },
    staleTime: 5 * 60 * 1000,
  });

  const visibleCategories = useMemo(() => {
    if (activeCategories.length === 0) {
      return CATEGORIES;
    }
    const standardMatches = CATEGORIES.filter((c) => activeCategories.includes(c.id));
    const customCategories = activeCategories
      .filter((cat) => !CATEGORIES.some((c) => c.id === cat))
      .map((cat) => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        icon: "ShoppingBasket",
      }));
    return [...standardMatches, ...customCategories];
  }, [activeCategories]);

  const rawProducts = useMemo(() => data.pages.flatMap((page) => page.items), [data]);

  const products = useMemo(() => {
    if (search.category) {
      return rawProducts.filter(
        (p) => (p.category || "").toLowerCase() === (search.category || "").toLowerCase(),
      );
    }
    return rawProducts;
  }, [rawProducts, search.category]);

  const updateSearch = (patch: HomeSearchUpdate) => {
    const next: HomeSearch = {
      q: patch.q !== undefined ? (patch.q ? patch.q.slice(0, 100) : undefined) : search.q,
      category:
        patch.category !== undefined
          ? patch.category
            ? patch.category
            : undefined
          : search.category,
      range:
        patch.range !== undefined
          ? patch.range === "all"
            ? undefined
            : patch.range
          : search.range,
      sort:
        patch.sort !== undefined
          ? patch.sort === "popular"
            ? undefined
            : patch.sort
          : search.sort,
      free:
        patch.free !== undefined
          ? patch.free
            ? true
            : undefined
          : search.free,
    };
    navigate({ search: next });
  };

  const isSearchActive = Boolean(search.q && search.q.trim().length > 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IntroAnimation />
      <SiteHeader
        query={search.q ?? ""}
        onQueryChange={(value) => updateSearch({ q: value })}
        suggestions={rawProducts.map((p) => ({ id: p.id, title: p.title, category: p.category }))}
      />

      {/* Se NÃO estiver pesquisando um termo específico, exibe os banners da vitrine */}
      {!isSearchActive && (
        <section className="bg-gradient-to-r from-primary via-primary/95 to-primary text-primary-foreground py-6 sm:py-8 shadow-inner">
          <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Entrega Rápida e Garantida
              </span>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                HS Digital Marketplace
              </h1>
              <p className="text-sm sm:text-base text-primary-foreground/90 max-w-xl">
                Milhares de produtos com frete rápido, compra protegida e garantia oficial.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-lg">
                <Link to="/jogos">
                  <Gamepad2 className="mr-2 h-5 w-5" /> Girar Roleta Diária
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-bold">
                <Link to="/cupons">
                  <Gift className="mr-2 h-5 w-5" /> Ver Cupons
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Barra de Categorias */}
      <nav className="border-b border-border bg-card shadow-sm sticky top-[57px] sm:top-[65px] z-40">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 scrollbar-none">
            <button
              type="button"
              onClick={() => updateSearch({ category: null })}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                !search.category
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Todas as categorias
            </button>
            {visibleCategories.map((cat) => {
              const Icon = ICONS[cat.icon] || ShoppingBasket;
              const isSelected = search.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateSearch({ category: cat.id })}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal / Resultados da Pesquisa estilo Mercado Livre */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            {isSearchActive ? (
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="text-xl sm:text-2xl font-black">
                  Resultados para <span className="text-primary">"{search.q}"</span>
                </h2>
                <button
                  onClick={() => updateSearch({ q: "" })}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive ml-2 bg-muted px-2 py-1 rounded"
                >
                  <X className="h-3.5 w-3.5" /> Limpar busca
                </button>
              </div>
            ) : search.category ? (
              <h2 className="text-xl sm:text-2xl font-black capitalize">
                Categoria: {visibleCategories.find((c) => c.id === search.category)?.name || search.category}
              </h2>
            ) : (
              <h2 className="text-xl sm:text-2xl font-black">Destaques da Loja</h2>
            )}
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {products.length} {products.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
          </div>

          {/* Filtros rápidos estilo Mercado Livre */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Select
              value={search.range ?? "all"}
              onValueChange={(val) => updateSearch({ range: val as any })}
            >
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="Preço" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={search.sort ?? "popular"}
              onValueChange={(val) => updateSearch({ sort: val as any })}
            >
              <SelectTrigger className="w-[160px] h-9 text-xs">
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
              onClick={() => updateSearch({ free: !search.free })}
              className={`h-9 px-3 rounded-md border text-xs font-semibold transition flex items-center gap-1.5 ${
                search.free
                  ? "bg-emerald-600 text-white border-emerald-600 shadow"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Truck className="h-3.5 w-3.5" /> Frete Grátis
            </button>
          </div>
        </div>

        {/* Grade de Produtos */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-bold text-muted-foreground">
              Nenhum produto encontrado {isSearchActive ? `para "${search.q}"` : "nesta categoria"}.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tente buscar por outros termos ou explore outras categorias.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => updateSearch({ q: "", category: null, free: false, range: "all" })}
            >
              Ver todos os produtos
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="mt-10 flex justify-center">
            <Button
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              size="lg"
              variant="outline"
              className="min-w-[200px]"
            >
              {isFetchingNextPage ? "Carregando mais produtos…" : "Carregar mais produtos"}
            </Button>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
