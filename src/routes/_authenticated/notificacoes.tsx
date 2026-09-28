import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({ meta: [
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
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["order-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,payment_status,status,created_at").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto w-full max-w-3xl px-4 py-8"><div className="flex items-center gap-3"><Bell className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Notificações</h1><p className="text-sm text-muted-foreground">Atualizações dos seus pedidos.</p></div></div>
    {isLoading ? <div className="mt-6 h-40 animate-pulse bg-muted" /> : orders.length === 0 ? <div className="surface-card mt-6 p-10 text-center"><p className="text-sm text-muted-foreground">Nenhuma atualização por enquanto.</p></div> : <div className="mt-6 divide-y divide-border border-y border-border">{orders.map((order) => { const approved = order.payment_status === "approved"; const failed = order.payment_status === "failed"; const Icon = approved ? CheckCircle2 : failed ? XCircle : Clock3; return <Link key={order.id} to="/pedido/$orderId" params={{ orderId: order.id }} className="flex items-start gap-3 py-4 hover:text-primary"><Icon className={`mt-0.5 h-5 w-5 ${approved ? "text-success" : failed ? "text-destructive" : "text-primary"}`} /><div><p className="text-sm font-semibold">{approved ? "Pagamento confirmado" : failed ? "Pagamento não aprovado" : "Pedido aguardando pagamento"}</p><p className="mt-1 text-xs text-muted-foreground">Pedido {order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleString("pt-BR")}</p></div></Link>; })}</div>}
  </main></div>;
}