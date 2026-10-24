import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, Clock3, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
      { name: "robots", content: "noindex, follow" },
    { title: "Notificações · HS Digital" },
    { name: "description", content: "Atualizações reais dos seus pedidos e pagamentos na HS Digital." },
    { property: "og:title", content: "Notificações · HS Digital" },
    { property: "og:description", content: "Atualizações dos seus pedidos na HS Digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const { data: alerts = [] } = useQuery({
    queryKey: ["account-notifications", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("account_notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    }, refetchInterval: 60000,
  });
  const markRead = async (id: string) => {
    const { error } = await supabase.from("account_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Não foi possível marcar como lida."); return; }
    await Promise.all([qc.invalidateQueries({ queryKey: ["account-notifications"] }), qc.invalidateQueries({ queryKey: ["notification-count"] })]);
  };
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["order-notifications"],
    queryFn: async () => {
      const [{ data, error }, { data: dismissed }] = await Promise.all([
        supabase.from("orders").select("id,payment_status,status,created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("dismissed_order_notifications").select("order_id"),
      ]);
      if (error) throw error;
      const hidden = new Set((dismissed ?? []).map((item) => item.order_id));
      return (data ?? []).filter((order) => !hidden.has(order.id));
    },
  });
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto w-full max-w-3xl px-4 py-8"><div className="flex items-center gap-3"><Bell className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Notificações</h1><p className="text-sm text-muted-foreground">Atualizações dos seus pedidos.</p></div></div>
    {alerts.length > 0 && <div className="mt-6 divide-y border-y">{alerts.map((alert) => <div key={alert.id} className={`flex items-start gap-3 py-4 ${alert.read_at ? "opacity-70" : ""}`}><Bell className="mt-1 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1">{alert.kind === "social" ? <Link to="/social" onClick={() => void markRead(alert.id)} className="text-sm font-semibold hover:text-primary">{alert.title}</Link> : <Link to="/pedido/$orderId" params={{ orderId: alert.target_id }} onClick={() => void markRead(alert.id)} className="text-sm font-semibold hover:text-primary">{alert.title}</Link>}<p className="mt-1 break-words text-sm text-muted-foreground">{alert.body}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString("pt-BR")}</p></div>{!alert.read_at && <Button variant="ghost" size="icon" aria-label="Marcar como lida" onClick={() => void markRead(alert.id)}><CheckCircle2 className="h-4 w-4" /></Button>}<Button variant="ghost" size="icon" aria-label="Excluir aviso" onClick={async () => { const { error } = await supabase.from("account_notifications").delete().eq("id", alert.id); if (error) { toast.error("Não foi possível excluir."); return; } await qc.invalidateQueries({ queryKey: ["account-notifications"] }); await qc.invalidateQueries({ queryKey: ["notification-count"] }); }}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
    {isLoading ? <div className="mt-6 h-40 animate-pulse bg-muted" /> : orders.length === 0 ? <div className="surface-card mt-6 p-10 text-center"><p className="text-sm text-muted-foreground">Nenhuma atualização por enquanto.</p></div> : <div className="mt-6 divide-y divide-border border-y border-border">{orders.map((order) => { const approved = order.payment_status === "approved"; const failed = order.payment_status === "failed"; const Icon = approved ? CheckCircle2 : failed ? XCircle : Clock3; return <div key={order.id} className="flex items-start gap-3 py-4"><Link to="/pedido/$orderId" params={{ orderId: order.id }} className="flex min-w-0 flex-1 items-start gap-3 hover:text-primary"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${approved ? "text-success" : failed ? "text-destructive" : "text-primary"}`} /><div><p className="text-sm font-semibold">{approved ? "Pagamento confirmado" : failed ? "Pagamento não aprovado" : "Pedido aguardando pagamento"}</p><p className="mt-1 text-xs text-muted-foreground">Pedido {order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleString("pt-BR")}</p></div></Link><Button variant="ghost" size="icon" aria-label="Remover notificação" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={async () => { const { data: user } = await supabase.auth.getUser(); if (!user.user) return; const { error } = await supabase.from("dismissed_order_notifications").insert({ user_id: user.user.id, order_id: order.id }); if (error) { toast.error("Não foi possível remover a notificação."); return; } await qc.invalidateQueries({ queryKey: ["order-notifications"] }); }}><Trash2 className="h-4 w-4" /></Button></div>; })}</div>}
  </main></div>;
}