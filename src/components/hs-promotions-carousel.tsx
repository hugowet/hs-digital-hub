import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flame, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

type Promo = { product_id: string; regular_price: number; promo_price: number; ends_at: string; title: string; image_url: string | null };

async function fetchPromos(): Promise<Promo[]> {
  const { data, error } = await supabase
    .from("hs_promotions")
    .select("product_id, regular_price, promo_price, ends_at, position, products(title, image_url, is_active)")
    .gt("ends_at", new Date().toISOString())
    .order("position");
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.products?.is_active)
    .map((row) => ({
      product_id: row.product_id,
      regular_price: Number(row.regular_price),
      promo_price: Number(row.promo_price),
      ends_at: row.ends_at,
      title: row.products!.title,
      image_url: row.products!.image_url,
    }));
}

function useCountdown(endsAt: string | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!endsAt || now === null) return null;
  const left = Math.max(0, new Date(endsAt).getTime() - now) / 1000;
  return { d: Math.floor(left / 86400), h: Math.floor((left % 86400) / 3600), m: Math.floor((left % 3600) / 60), s: Math.floor(left % 60) };
}

export function HsPromotionsCarousel() {
  const { data: promos = [] } = useQuery({ queryKey: ["hs-promotions"], queryFn: fetchPromos, staleTime: 60_000 });
  const track = useRef<HTMLDivElement>(null);
  const time = useCountdown(promos[0]?.ends_at);
  if (!promos.length) return null;
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="mx-auto mb-5 max-w-7xl px-4" aria-label="Promoções HS">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-accent p-3 text-primary-foreground shadow-xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-black uppercase">
            <Flame className="h-5 w-5" /> Promoções HS
          </h2>
          {time && (
            <div className="flex items-center gap-1.5 rounded-full bg-background/20 px-3 py-1 text-sm font-bold tabular-nums">
              <Timer className="h-4 w-4" /> Termina em {time.d}d {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
            </div>
          )}
        </div>
        <div className="relative">
          <button type="button" aria-label="Promoções anteriores" onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background p-2 text-foreground shadow-lg">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div ref={track} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-8 [scrollbar-width:none]">
            {promos.map((p) => {
              const off = Math.round((1 - p.promo_price / p.regular_price) * 100);
              return (
                <Link key={p.product_id} to="/produto/$productId" params={{ productId: p.product_id }}
                  className="w-40 shrink-0 snap-start overflow-hidden rounded-xl bg-card text-card-foreground shadow">
                  <div className="relative aspect-square bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-contain" loading="lazy" />}
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-destructive px-1.5 py-0.5 text-xs font-black text-destructive-foreground">-{off}%</span>
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs">{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-through">{brl(p.regular_price)}</p>
                    <p className="text-base font-black text-primary">{brl(p.promo_price)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <button type="button" aria-label="Próximas promoções" onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background p-2 text-foreground shadow-lg">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
