import { createFileRoute, Link } from "@tanstack/react-router";
import { infiniteQueryOptions, useSuspenseInfiniteQuery } from "@tanstack/react-query";
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
  MessageCircle,
  Play,
  Radio,
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
  Users,
  Watch,
  X,
  Zap,
  Crown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { personalizeProducts, recordCategoryClick, recordSearch } from "@/lib/interest-profile";
import { IntroAnimation } from "@/components/intro-animation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/catalog";
import { fetchCatalogPage } from "@/lib/catalog.functions";
import { storefrontDay } from "@/lib/storefront-selection";
import { SITE_ORIGIN } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { useRadio } from "@/lib/radio-context";
import lupiBannerSquare from "@/assets/lupi-banner-square.jpg";

type HomeSearch = {
  supplier?: "cj" | "amazon";
  q?: string | undefined;
  category?: string | undefined;
  range?: "a" | "b" | "c" | "d" | undefined;
  sort?: "price-asc" | "price-desc" | undefined;
  free?: true | undefined;
};

type HomeSearchUpdate = {
  supplier?: "cj" | "amazon" | null;
  q?: string | undefined;
  category?: string | null | undefined;
  range?: HomeSearch["range"] | "all";
  sort?: HomeSearch["sort"] | "popular";
  free?: boolean | undefined;
};

const normalizeSearch = (search: Record<string, unknown>): HomeSearch => ({
  ...(["cj", "amazon"].includes(String(search["supplier"])) ? { supplier: search["supplier"] as "cj" | "amazon" } : {}),
  ...(typeof search["q"] === "string" && search["q"] ? { q: search["q"].slice(0, 100) } : {}),
  ...(typeof search["category"] === "string" && search["category"] ? { category: search["category"] } : {}),
  ...(["a", "b", "c", "d"].includes(String(search["range"])) ? { range: search["range"] as HomeSearch["range"] } : {}),
  ...(["price-asc", "price-desc"].includes(String(search["sort"]))
    ? { sort: search["sort"] as HomeSearch["sort"] }
    : {}),
  ...(search["free"] === true || search["free"] === "true" ? { free: true as const } : {}),
});

const resolveSearch = (search: HomeSearch) => ({
  supplier: search.supplier ?? null,
  q: search.q ?? "",
  category: search.category ?? null,
  range: search.range ?? ("all" as const),
  sort: search.sort ?? ("popular" as const),
  free: search.free ?? false,
});

const catalogQueryOptions = (search: HomeSearch) =>
  infiniteQueryOptions({
    queryKey: ["catalog", search, storefrontDay()],
    queryFn: ({ pageParam }) => {
      const resolved = resolveSearch(search);
      return fetchCatalogPage({
        data: {
          page: pageParam,
          pageSize: 24,
          query: resolved.q,
          category: resolved.category,
          supplier: resolved.supplier,
          range: resolved.range,
          sort: resolved.sort,
          onlyFreeShipping: resolved.free,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  validateSearch: normalizeSearch,
  loaderDeps: ({ search }) => search,
  // On search/filter changes while already on the home page, don't block the route:
  // the component keeps showing the previous products (useDeferredValue) until the new page arrives.
  loader: ({ context, deps, cause }) => {
    const options = catalogQueryOptions(deps);
    if (cause === "stay") {
      void context.queryClient.prefetchInfiniteQuery(options);
      return;
    }
    return context.queryClient.ensureInfiniteQueryData(options);
  },
  head: ({ match }) => {
    const search = resolveSearch(match.search);
    const params = new URLSearchParams();
    if (search.q) params.set("q", search.q);
    if (search.category) params.set("category", search.category);
    if (search.supplier) params.set("supplier", search.supplier);
    if (search.range !== "all") params.set("range", search.range);
    if (search.sort !== "popular") params.set("sort", search.sort);
    if (search.free) params.set("free", "true");
    const url = `${SITE_ORIGIN}/${params.size ? `?${params}` : ""}`;
    return {
    meta: [
      { title: "HS Digital Marketplace | Eletrônicos, ferramentas, moda e casa" },
      {
        name: "description",
        content:
          "Encontre eletrônicos, ferramentas, acessórios para carros e motos, moda e utilidades na HS Digital. Confira preços, detalhes e entrega para seu endereço.",
      },
      { property: "og:title", content: "HS Digital · Marketplace" },
      { property: "og:description", content: "Produtos selecionados, compra rápida e entrega segura na HS Digital." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      ...(params.size ? [{ name: "robots", content: "noindex, follow" }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: params.size ? [] : [{ type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org", "@type": "WebSite", name: "HS Digital Marketplace", url: SITE_ORIGIN,
    }) }],
  };
  },
  errorComponent: () => <div role="alert" className="p-8">Não foi possível carregar a vitrine. <a href="/">Tentar novamente</a></div>,
  notFoundComponent: () => <div className="p-8">Página não encontrada. <Link to="/">Voltar à loja</Link></div>,
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
  { id: "c", label: "R$ 100 a R$ 250", min: 100, max: 250 },
  { id: "d", label: "Mais de R$ 250", min: 250, max: Infinity },
] as const;

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

type BannerSlide =
  | { kind: "rapaz"; buyerOnly?: boolean }
  | { kind: "lupi"; buyerOnly?: boolean }
  | { kind: "highlight"; title: string; text: string; icon: LucideIcon; buyerOnly?: boolean };

const BANNER_SLIDES: BannerSlide[] = [
  { kind: "rapaz" },
  { kind: "lupi" },
  { kind: "highlight", title: "Clube HS", text: "Sua experiência HS vai além das compras.", icon: Crown },
  { kind: "highlight", title: "Afiliados HS", text: "Compartilhe a HS Digital. Conheça nosso programa de afiliados.", icon: Users },
  { kind: "highlight", title: "Jogos & Prêmios", text: "Junte moedas e conquiste cupons de desconto no frete!", icon: Gamepad2, buyerOnly: true },
  { kind: "highlight", title: "Rádio HS", text: "Dê play na sua música. Continue curtindo enquanto compra.", icon: Radio },
];

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
        <Button asChild variant="secondary" className="w-fit shadow-sm rounded-full">
          <Link to="/jogos">
            <Gamepad2 className="h-4 w-4 mr-2" /> Jogos &amp; Prêmios
          </Link>
        </Button>
      )}

      {/* Botão do Clube HS */}
      <Button asChild className="w-fit bg-amber-500 hover:bg-amber-600 text-white font-bold border-none shadow-sm rounded-full">
        <Link to="/clube-hs">
          <Crown className="h-4 w-4 mr-2 fill-white" /> Clube HS
        </Link>
      </Button>

      {/* 📻 BOTÃO DA RÁDIO HS */}
      <RadioNavButton />

      {/* 🟢 BOTÃO DO HS SOCIAL (COLADO AO LADO DA RÁDIO HS) */}
      <Button
        asChild
        className="w-fit font-bold border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 shadow-sm rounded-full transition-all duration-300"
      >
        <Link to="/social" className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-emerald-300" />
          <span>HS Social</span>
        </Link>
      </Button>

      {/* 🎬 BOTÃO DO HSTRENDS */}
      <Button
        asChild
        className="w-fit font-bold border border-fuchsia-400/40 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-100 shadow-sm rounded-full transition-all duration-300"
      >
        <Link to="/trends" className="inline-flex items-center gap-1.5">
          <Play className="h-4 w-4 text-fuchsia-300" />
          <span>HSTrends</span>
        </Link>
      </Button>
    </div>
  );
}

function Home() {
  const routeSearch = Route.useSearch();
  const search = resolveSearch(routeSearch);
  const navigate = Route.useNavigate();
  const deferredSearch = useDeferredValue(routeSearch);
  const isSearching = deferredSearch !== routeSearch;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    catalogQueryOptions(deferredSearch),
  );
  const products = data.pages.flatMap((page) => page.products);

  const [bannerSlide, setBannerSlide] = useState(0);
  const [isBuyer, setIsBuyer] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || !active) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const seller = roles?.some((item) => item.role === "seller") ?? false;
      if (active) setIsBuyer((roles?.some((item) => item.role === "buyer") ?? false) && !seller);
    });
    return () => { active = false; };
  }, []);

  const bannerSlides = useMemo(() => BANNER_SLIDES.filter((slide) => !slide.buyerOnly || isBuyer), [isBuyer]);
  const currentSlide = bannerSlides[bannerSlide % bannerSlides.length];

  useEffect(() => {
    const id = window.setInterval(() => setBannerSlide((value) => (value + 1) % bannerSlides.length), 5000);
    return () => window.clearInterval(id);
  }, [bannerSlides.length]);

  const activeCategories = useMemo(() => {
      const uniqueSlugs = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
      const extraSlugs = uniqueSlugs.filter((slug) => !CATEGORIES.some((category) => category.slug === slug));
      return [...CATEGORIES, ...extraSlugs.map((slug) => {
        const found = CATEGORIES.find((c) => c.slug === slug);
        if (found) return found;
        const formatted = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        return { slug, label: formatted, icon: "ShoppingBasket" };
      })];
  }, [data]);

  // First filter from the clean home adds one history entry (so Back returns to the home);
  // further typing/filter changes replace it instead of stacking entries.
  const isFiltered = Boolean(search.supplier || search.q || search.category || search.free || search.range !== "all" || search.sort !== "popular");
  const setSearch = (changes: HomeSearchUpdate, options?: { replace?: boolean }) =>
    navigate({
      replace: options?.replace ?? isFiltered,
      search: (previous) => {
        const next = { ...previous, ...changes } as Record<string, unknown>;
        if (!next["q"]) delete next["q"];
        if (!next["category"]) delete next["category"];
        if (!next["supplier"]) delete next["supplier"];
        if (next["range"] === "all") delete next["range"];
        if (next["sort"] === "popular") delete next["sort"];
        if (!next["free"]) delete next["free"];
        return next as HomeSearch;
      },
    });

  // Learn from searches (debounced so each typed phrase counts once).
  useEffect(() => {
    if (!search.q || search.q.trim().length < 3) return;
    const id = window.setTimeout(() => recordSearch(search.q), 1500);
    return () => window.clearTimeout(id);
  }, [search.q]);

  // On the unfiltered storefront, re-rank by this person's interest profile so
  // each visitor sees more of what they search, click and view.
  const personalized = useMemo(
    () => (isFiltered ? products : personalizeProducts(products)),
    [products, isFiltered],
  );

  const filtered = useMemo(() => {
    const selectedRange = PRICE_RANGES.find((item) => item.id === search.range) ?? {
      min: 0,
      max: Infinity,
    };

    return personalized.filter((p) => {
      const price = Number(p.price);
      if (price < selectedRange.min || price > selectedRange.max) return false;
      return true;
    });
  }, [personalized, search.range]);

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

                  {/* BOTÕES DE AÇÃO: JOGOS, CLUBE HS, RÁDIO HS E HS SOCIAL */}
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
{/* BANNER DE FRETE GRÁTIS ANTES DAS CATEGORIAS */}
<section className="relative mb-5 overflow-hidden rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-950 via-emerald-700 to-emerald-950 p-2 shadow-xl sm:p-3">
  <div className="flex flex-col items-center gap-3 rounded-xl bg-black/70 p-3 md:flex-row">
    <div className="relative aspect-square w-44 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-400 bg-black/70 shadow-lg sm:w-52">
      {bannerSlides.map((slide, index) => (
        <div
          key={slide.kind === "highlight" ? slide.title : slide.kind}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === bannerSlide % bannerSlides.length ? "opacity-100" : "opacity-0"}`}
        >
          {slide.kind === "rapaz" ? (
            <img
              src="/images/banner-frete-gratis.jpg"
              alt="HS Digital: frete grátis na sua primeira compra"
              className="h-full w-full object-cover"
              loading="eager"
            />
          ) : slide.kind === "lupi" ? (
            <img
              src={lupiBannerSquare}
              alt="Lupi, o lobo da HS Digital, com um carrinho cheio de compras"
              className="h-full w-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-950 via-emerald-700 to-emerald-950">
              <slide.icon className="size-24 text-amber-300" aria-hidden="true" />
            </div>
          )}
        </div>
      ))}
    </div>

    <div className="text-center text-white md:text-left">
      {currentSlide.kind === "highlight" ? (
        <>
          <currentSlide.icon className="h-10 w-10 text-amber-300" aria-hidden="true" />
          <h2 className="mt-3 text-1xl font-black uppercase sm:text-2xl">{currentSlide.title}</h2>
          <p className="mt-2 text-sm text-white/85">{currentSlide.text}</p>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase">
            <Zap className="h-4 w-4" />
          </span>
          <h2 className="mt-3 text-1xl font-black uppercase sm:text-2xl">
            Venha para HS Digital{" "}
            <span className="text-emerald-300">!</span>
          </h2>
        </>
      )}

      <button
        type="button"
        onClick={() => setSearch({ free: true, category: null })}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:scale-105 hover:bg-amber-300"
      >
        <Gift className="h-5 w-5" />
         EVOLUA SEU JEITO DE COMPRAR🛒
      </button>
    </div>
  </div>
</section>

        <div className="mx-auto max-w-7xl px-4 py-6">
          <Tabs value={search.supplier ?? "all"} onValueChange={(value) => setSearch({ supplier: value === "cj" || value === "amazon" ? value : null })} className="mb-6">
            <TabsList aria-label="Origem dos produtos" className="h-auto flex w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="all">Todos os produtos</TabsTrigger>
              <TabsTrigger value="cj">Produtos internacionais</TabsTrigger>
              <TabsTrigger value="amazon">Produtos nacionais</TabsTrigger>
            </TabsList>
          </Tabs>
          {/* CATEGORIAS EM DESTAQUE */}
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Categorias em destaque
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
              <button
                type="button"
                onClick={() => setSearch({ category: null })}
                className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border text-xs font-medium transition ${
                  !search.category
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-muted/40"
                }`}
              >
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBasket className="h-4 w-4" />
                </div>
                <span className="mt-1.5 text-[11px] truncate max-w-[70px]">Todas</span>
              </button>

              {activeCategories.map((category) => {
                const IconComponent = ICONS[category.icon] || ShoppingBasket;
                const active = search.category === category.slug;
                return (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => { recordCategoryClick(category.slug); setSearch({ category: category.slug }); }}
                    className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border text-xs font-medium transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="mt-1.5 text-[11px] truncate max-w-[70px]">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTA DE PRODUTOS */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {activeCategory ? activeCategory.label : search.q ? "Resultados da busca" : search.supplier === "cj" ? "Produtos internacionais" : search.supplier === "amazon" ? "Produtos nacionais" : "Seleção do dia"}
              </h2>
              <p className="text-xs text-gray-500">
                {filtered.length} produto{filtered.length === 1 ? "" : "s"} encontrado{filtered.length === 1 ? "" : "s"}
              </p>
            </div>

            <Select
              value={search.sort}
              onValueChange={(val: any) => setSearch({ sort: val })}
            >
              <SelectTrigger className="w-[160px] h-9 text-xs bg-white">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Mais populares</SelectItem>
                <SelectItem value="price-asc">Menor preço</SelectItem>
                <SelectItem value="price-desc">Maior preço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-gray-700">Nenhum produto encontrado</p>
              <p className="mt-1 text-xs text-gray-500">
                Tente outro termo ou navegue pelas categorias acima.
              </p>
            </div>
          ) : (
            <div aria-busy={isSearching} className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 transition-opacity ${isSearching ? "opacity-60" : ""}`}>
              {filtered.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="bg-white border-gray-300 font-semibold text-xs h-10 px-6"
              >
                {isFetchingNextPage ? "Carregando mais produtos..." : "Carregar mais ofertas"}
              </Button>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
