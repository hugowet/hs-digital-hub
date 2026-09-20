import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Baby,
  BadgePercent,
  Dumbbell,
  Gamepad2,
  Headphones,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CATEGORIES, fetchProducts } from "@/lib/catalog";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HS Digital · Ofertas de várias lojas em um só lugar" },
      {
        name: "description",
        content:
          "Compre eletrônicos, moda, beleza e games no marketplace HS Digital com frete grátis e compra rápida.",
      },
      { property: "og:title", content: "HS Digital · Marketplace" },
      {
        property: "og:description",
        content: "Ofertas de várias lojas, frete grátis e compra rápida no marketplace HS Digital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const ICONS: Record<string, typeof Smartphone> = {
  Smartphone,
  Shirt,
  Sofa,
  Sparkles,
  Gamepad2,
  Dumbbell,
  Baby,
  ShoppingBasket,
};

const PRICE_RANGES = [
  { id: "all", label: "Todos os preços", min: 0, max: Infinity },
  { id: "a", label: "Até R$ 100", min: 0, max: 100 },
  { id: "b", label: "R$ 100 a R$ 250", min: 100, max: 250 },
  { id: "c", label: "R$ 250 a R$ 500", min: 250, max: 500 },
  { id: "d", label: "Acima de R$ 500", min: 500, max: Infinity },
];

function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [range, setRange] = useState("all");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const filtered = useMemo(() => {
    const r = PRICE_RANGES.find((p) => p.id === range)!;
    return products.filter((p) => {
      const price = Number(p.price);
      const matchQuery = p.title.toLowerCase().includes(query.trim().toLowerCase());
      const matchCategory = !category || p.category === category;
      return matchQuery && matchCategory && price >= r.min && price <= r.max;
    });
  }, [products, query, category, range]);

  const highlight = products[0];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader query={query} onQueryChange={setQuery} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-8">
        {/* Banner principal */}
        <section className="mt-4 overflow-hidden rounded-2xl brand-gradient">
          <div className="grid items-center gap-6 p-6 sm:grid-cols-2 sm:p-10">
            <div className="text-primary-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <BadgePercent className="h-3.5 w-3.5" /> Semana HS · até 45% OFF
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
                Tudo o que você precisa, de várias lojas, num só carrinho.
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/75 sm:text-base">
                Frete grátis em milhares de itens, pagamento seguro e repasse automático para os
                vendedores parceiros.
              </p>
              {highlight && (
                <p className="mt-5 text-sm text-white/80">
                  Destaque de hoje:{" "}
                  <span className="font-semibold text-white">{highlight.title}</span> por{" "}
                  <span className="font-display text-xl font-bold text-white">
                    {brl(Number(highlight.price))}
                  </span>
                </p>
              )}
            </div>
            <img
              src="/images/banner-1.jpg"
              alt="Ofertas HS Digital"
              width={1600}
              height={704}
              className="h-48 w-full rounded-xl object-cover sm:h-64"
            />
          </div>
        </section>

        {/* Selos */}
        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Truck, title: "Frete grátis", text: "Em milhares de produtos selecionados" },
            { icon: ShieldCheck, title: "Compra segura", text: "Pagamento protegido pela HS Digital" },
            { icon: Headphones, title: "Suporte 7 dias", text: "Atendimento rápido de verdade" },
          ].map((item) => (
            <div key={item.title} className="surface-card flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Categorias */}
        <section className="surface-card mt-4 p-4">
          <h2 className="mb-4 text-base font-semibold">Categorias</h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {CATEGORIES.map((c) => {
              const Icon = ICONS[c.icon] ?? Smartphone;
              const active = category === c.slug;
              return (
                <button
                  key={c.slug}
                  onClick={() => setCategory(active ? null : c.slug)}
                  className={`flex flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors ${
                    active ? "bg-accent" : "hover:bg-muted"
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full ${
                      active ? "primary-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium leading-tight">{c.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Filtros + grid */}
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">
              {category ? CATEGORIES.find((c) => c.slug === category)?.label : "Ofertas do dia"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === r.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="surface-card h-80 animate-pulse bg-muted/60" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para esta busca.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
