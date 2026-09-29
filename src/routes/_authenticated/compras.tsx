import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ChevronRight, PackageCheck, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { cancelUnpaidMarketplaceOrder } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({ meta: [
    { title: "Minhas compras · HS Digital" },
    { name: "description", content: "Acompanhe seus pedidos e pagamentos na HS Digital." },
    { property: "og:title", content: "Minhas compras · HS Digital" },
    { property: "og:description", content: "Pedidos e pagamentos da sua conta HS Digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const qc = useQueryClient();
  const cancelOrder = useServerFn(cancelUnpaidMarketplaceOrder);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id,total,status,payment_status,created_at,order_items(id,title,quantity,unit_price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto w-full max-w-5xl px-4 py-8">
    <div className="flex items-center gap-3"><ShoppingBag className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Minhas compras</h1><p className="text-sm text-muted-foreground">Pedidos e pagamentos da sua conta.</p></div></div>
    {isLoading ? <div className="mt-6 h-40 animate-pulse bg-muted" /> : orders.length === 0 ? <div className="surface-card mt-6 p-10 text-center"><PackageCheck className="mx-auto h-9 w-9 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Você ainda não fez nenhuma compra.</p><Button asChild className="mt-4"><Link to="/">Ver ofertas</Link></Button></div> : <div className="mt-6 space-y-3">{orders.map((order) => <article key={order.id} className="surface-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">Pedido {order.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 flex items-center gap-1 text-sm"><CalendarDays className="h-4 w-4" />{new Date(order.created_at).toLocaleDateString("pt-BR")}</p></div><div className="text-right"><p className="font-bold text-primary">{brl(Number(order.total))}</p><p className="text-xs font-semibold">{order.status === "cancelled" ? "Cancelado" : order.payment_status === "approved" ? "Pago" : order.payment_status === "failed" ? "Pagamento não aprovado" : "Aguardando pagamento"}</p></div></div><div className="mt-3 border-t border-border pt-3"><p className="line-clamp-2 text-sm text-muted-foreground">{order.order_items.map((item) => `${item.quantity}x ${item.title}`).join(" · ")}</p><div className="mt-2 flex flex-wrap items-center gap-2"><Button asChild variant="ghost" className="px-0"><Link to="/pedido/$orderId" params={{ orderId: order.id }}>Ver pedido <ChevronRight /></Link></Button>{order.status === "awaiting_payment" && order.payment_status === "pending" && <Button variant="outline" size="sm" className="text-destructive" onClick={async () => { if (!window.confirm("Cancelar este pedido não pago e devolver os itens ao estoque?")) return; try { await cancelOrder({ data: { orderId: order.id } }); toast.success("Pedido cancelado e estoque liberado."); await qc.invalidateQueries({ queryKey: ["my-purchases"] }); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível cancelar o pedido."); } }}><Trash2 />Cancelar pedido</Button>}</div></div></article>)}</div>}
  </main></div>;
}