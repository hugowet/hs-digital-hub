import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Clock3, Gift, TicketCheck, Truck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getMyCoupons } from "@/lib/games.functions";

type Coupon = Awaited<ReturnType<typeof getMyCoupons>>[number];

export const Route = createFileRoute("/_authenticated/cupons")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
      { name: "robots", content: "noindex, follow" },
    { title: "Meus cupons · HS Digital" },
    { name: "description", content: "Consulte seus cupons de frete da HS Digital." },
    { property: "og:title", content: "Meus cupons · HS Digital" },
    { property: "og:description", content: "Seus prêmios e descontos de frete na HS Digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CouponsPage,
});

function CouponsPage() {
  const loadCoupons = useServerFn(getMyCoupons);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoupons().then(setCoupons).finally(() => setLoading(false));
  }, [loadCoupons]);

  const now = Date.now();
  return <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-primary">Vantagens da sua conta</p><h1 className="mt-1 text-3xl font-bold">Meus cupons</h1></div>
        <Button asChild variant="outline"><Link to="/jogos"><Gift className="h-4 w-4" /> Ganhar cupons</Link></Button>
      </div>
      {loading ? <div className="mt-8 h-32 animate-pulse rounded-lg bg-muted" /> : coupons.length === 0 ? (
        <section className="mt-8 border-y border-border py-14 text-center"><TicketCheck className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-3 text-lg font-semibold">Nenhum cupom por enquanto</h2><p className="mt-1 text-sm text-muted-foreground">Jogue a roleta ou raspe o cartão para tentar ganhar.</p></section>
      ) : <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {coupons.map((coupon) => {
          const expired = new Date(coupon.expires_at).getTime() <= now;
          const active = coupon.status === "active" && !expired;
          const title = coupon.kind === "free_shipping" ? "Frete grátis" : `${Number(coupon.percent_off)}% no frete`;
          return <article key={coupon.id} className={`relative overflow-hidden rounded-lg border p-5 ${active ? "border-primary/30 bg-card" : "border-border bg-muted/40 opacity-70"}`}>
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Truck className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="font-bold">{title}</h2><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{active ? "Disponível" : coupon.status === "redeemed" ? "Usado" : "Expirado"}</span></div><p className="mt-1 text-xs text-muted-foreground">Desconto de até R$ 30,00 · válido somente no frete</p><div className="mt-4 flex items-center justify-between gap-3"><code className="rounded bg-muted px-2 py-1 text-xs font-bold text-foreground">{coupon.code}</code><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> até {new Date(coupon.expires_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span></div></div></div>
          </article>;
        })}
      </div>}
    </main>
    <SiteFooter />
  </div>;
}