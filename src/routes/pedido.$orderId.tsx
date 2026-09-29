import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock3, Copy, CreditCard, Download, MessageCircle, QrCode, Send, Store } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MercadoPagoCard } from "@/components/mercado-pago-card";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { createMercadoPagoPayment, getMercadoPagoPublicConfig, reconcileMercadoPagoPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/pedido/$orderId")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Pagamento do pedido · HS Digital" },
    { name: "description", content: "Pague seu pedido com Pix ou cartão e acompanhe a confirmação." },
    { property: "og:title", content: "Pagamento do pedido · HS Digital" },
    { property: "og:description", content: "Pagamento protegido e confirmação do pedido HS Digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: OrderPaymentPage,
});

function OrderPaymentPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { clear } = useCart();
  const createPayment = useServerFn(createMercadoPagoPayment);
  const reconcilePayment = useServerFn(reconcileMercadoPagoPayment);
  const getPublicConfig = useServerFn(getMercadoPagoPublicConfig);
  const [creatingPix, setCreatingPix] = useState<string | null>(null);
  const [pixCpf, setPixCpf] = useState("");
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-order", orderId],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const [{ data: order, error }, { data: items }, { data: transactions }, { data: deliveries }, { data: tracking }, { data: conversation }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("payment_transactions").select("*,stores(name)").eq("order_id", orderId).order("created_at"),
        supabase.from("digital_deliveries").select("*").eq("order_id", orderId),
        supabase.from("order_tracking_events").select("*").eq("order_id", orderId).order("created_at"),
        supabase.from("order_conversations").select("id,order_messages(id,body,sender_id,created_at)").eq("order_id", orderId).maybeSingle(),
      ]);
      if (error) throw error;
      if (!order) return null;
      return { order, items: items ?? [], transactions: transactions ?? [], deliveries: deliveries ?? [], tracking: tracking ?? [], conversation };
    },
    refetchInterval: (query) => query.state.data?.order.payment_status === "approved" ? false : 5000,
  });
  const { data: mpConfig } = useQuery({ queryKey: ["mp-public-config"], queryFn: () => getPublicConfig() });

  useEffect(() => {
    if (data?.order.payment_status === "approved") clear();
  }, [clear, data?.order.payment_status]);

  useEffect(() => {
    if (!data || data.order.payment_status === "approved") return;
    const pending = data.transactions.filter((transaction) => transaction.provider_payment_id && ["pending", "in_process"].includes(transaction.status));
    if (pending.length === 0) return;
    const timeoutId = window.setTimeout(async () => {
      await Promise.allSettled(pending.map((transaction) => reconcilePayment({ data: { transactionId: transaction.id } })));
      await qc.invalidateQueries({ queryKey: ["buyer-order", orderId] });
    }, 8_000);
    return () => window.clearTimeout(timeoutId);
  }, [data, orderId, qc, reconcilePayment]);

  const payCard = useCallback(async (transactionId: string, cardData: {
    token: string; payment_method_id: string; issuer_id?: string; installments: number;
    payer: { email: string; identification?: { type?: string; number?: string } };
  }) => {
    try {
      await createPayment({ data: {
        transactionId,
        origin: window.location.origin,
        method: "card",
        card: {
          token: cardData.token,
          paymentMethodId: cardData.payment_method_id,
          issuerId: cardData.issuer_id,
          installments: cardData.installments,
          email: cardData.payer.email,
          identificationType: cardData.payer.identification?.type,
          identificationNumber: cardData.payer.identification?.number,
        },
      } });
      toast.success("Pagamento enviado para análise.");
      await qc.invalidateQueries({ queryKey: ["buyer-order", orderId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pagamento recusado.");
    }
  }, [createPayment, orderId, qc]);

  if (isLoading) return <Shell><div className="h-64 animate-pulse bg-muted" /></Shell>;
  if (!data) return <Shell><div className="py-20 text-center"><p>Pedido não encontrado.</p><Button asChild className="mt-4"><Link to="/">Voltar à vitrine</Link></Button></div></Shell>;

  return <Shell>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm text-muted-foreground">Pedido {orderId.slice(0, 8).toUpperCase()}</p><h1 className="text-2xl font-bold">{data.order.payment_status === "approved" ? "Pedido pago" : "Conclua o pagamento"}</h1></div>
      <span className={`rounded-md px-3 py-1 text-sm font-semibold ${data.order.payment_status === "approved" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>{data.order.payment_status === "approved" ? "PAGO" : "AGUARDANDO PAGAMENTO"}</span>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {data.transactions.map((transaction) => {
          const storeItems = data.items.filter((item) => item.store_id === transaction.store_id);
          const approved = transaction.status === "approved";
          return <section key={transaction.id} className="surface-card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3"><Store className="h-4 w-4 text-primary" /><strong>{transaction.stores?.name ?? "Loja parceira"}</strong><span className="ml-auto font-bold">{brl(Number(transaction.gross_amount))}</span></header>
            <div className="p-4">
              <ul className="space-y-2 text-sm">{storeItems.map((item) => <li key={item.id} className="flex justify-between gap-3"><span>{item.quantity}x {item.title}</span><span>{brl(Number(item.unit_price) * item.quantity)}</span></li>)}</ul>
              {approved ? <div className="mt-4 flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm font-semibold text-success"><CheckCircle2 className="h-5 w-5" />Pagamento confirmado</div> : transaction.pix_qr_code ? <PixPayment transaction={transaction} /> : transaction.provider_payment_id ? <div className="mt-4 flex items-center gap-2 rounded-md bg-muted p-3 text-sm"><Clock3 className="h-5 w-5 text-primary" />Pagamento em processamento. Esta página atualiza automaticamente.</div> : !mpConfig?.configured ? <p className="mt-4 rounded-md border border-border p-3 text-sm text-muted-foreground">O pagamento ficará disponível assim que o Mercado Pago for configurado pelo administrador.</p> : <Tabs defaultValue="pix" className="mt-4">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="pix"><QrCode />Pix</TabsTrigger><TabsTrigger value="card"><CreditCard />Cartão</TabsTrigger></TabsList>
                <TabsContent value="pix" className="space-y-3 pt-3"><div><Label htmlFor={`pix-cpf-${transaction.id}`}>CPF do pagador</Label><Input id={`pix-cpf-${transaction.id}`} value={pixCpf} onChange={(event) => setPixCpf(event.target.value)} inputMode="numeric" autoComplete="off" maxLength={14} placeholder="000.000.000-00" className="mt-1" /></div><Button className="w-full" disabled={creatingPix === transaction.id} onClick={async () => { const cpf = pixCpf.replace(/\D/g, ""); if (cpf.length !== 11) { toast.error("Informe um CPF válido com 11 números."); return; } try { setCreatingPix(transaction.id); await createPayment({ data: { transactionId: transaction.id, origin: window.location.origin, method: "pix", pix: { identificationNumber: cpf } } }); await qc.invalidateQueries({ queryKey: ["buyer-order", orderId] }); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível gerar o Pix."); } finally { setCreatingPix(null); } }}>{creatingPix === transaction.id ? "Gerando Pix…" : "Gerar QR Code Pix"}</Button></TabsContent>
                <TabsContent value="card" className="pt-3"><MercadoPagoCard publicKey={mpConfig.publicKey} amount={Number(transaction.gross_amount)} onSubmit={(cardData) => payCard(transaction.id, cardData)} /></TabsContent>
              </Tabs>}
            </div>
          </section>;
        })}
        {data.deliveries.length > 0 && <section className="surface-card p-4"><h2 className="flex items-center gap-2 font-semibold"><Download className="h-5 w-5 text-success" />Acessos digitais liberados</h2><div className="mt-3 space-y-3">{data.deliveries.map((delivery) => <div key={delivery.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><div><p className="font-medium">{delivery.title}</p>{delivery.delivery_instructions && <p className="text-sm text-muted-foreground">{delivery.delivery_instructions}</p>}</div><Button asChild><a href={delivery.delivery_url} target="_blank" rel="noreferrer">Acessar produto</a></Button></div>)}</div></section>}
        <TrackingStepper events={data.tracking} paid={data.order.payment_status === "approved"} />
        <section className="surface-card p-4"><h2 className="flex items-center gap-2 font-semibold"><MessageCircle className="h-5 w-5 text-primary" />Mensagem sobre a compra</h2><div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{(data.conversation?.order_messages ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((item) => <div key={item.id} className="rounded-lg bg-muted p-3 text-sm">{item.body}<p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</p></div>)}</div><form className="mt-3 flex gap-2" onSubmit={async (event) => { event.preventDefault(); const body = message.trim(); if (!body) return; const { data: user } = await supabase.auth.getUser(); if (!user.user) return; let conversationId = data.conversation?.id; if (!conversationId) { const { data: created, error } = await supabase.from("order_conversations").insert({ order_id: orderId, buyer_id: user.user.id }).select("id").single(); if (error) { toast.error(error.message); return; } conversationId = created.id; } const { error } = await supabase.from("order_messages").insert({ conversation_id: conversationId, sender_id: user.user.id, body }); if (error) toast.error(error.message); else { setMessage(""); await qc.invalidateQueries({ queryKey: ["buyer-order", orderId] }); } }}><Input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder="Escreva para o atendimento sobre este pedido" /><Button type="submit" size="icon" aria-label="Enviar mensagem"><Send /></Button></form></section>
      </div>
      <aside className="surface-card h-fit p-4 lg:sticky lg:top-28"><h2 className="font-semibold">Resumo</h2><div className="mt-3 flex justify-between border-b border-border pb-3 text-sm"><span className="text-muted-foreground">{data.items.reduce((sum, item) => sum + item.quantity, 0)} itens</span><strong>{brl(Number(data.order.total))}</strong></div><p className="mt-3 text-xs text-muted-foreground">Em carrinhos com várias lojas, cada pagamento é confirmado separadamente. O pedido fica pago após todas as lojas receberem.</p><Button variant="outline" className="mt-4 w-full" onClick={() => navigate({ to: "/" })}>Continuar comprando</Button></aside>
    </div>
  </Shell>;
}

function PixPayment({ transaction }: { transaction: { pix_qr_code: string | null; pix_qr_code_base64: string | null; payment_expires_at: string | null } }) {
  return <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-[180px_1fr] sm:items-center">
    {transaction.pix_qr_code_base64 && <img src={`data:image/png;base64,${transaction.pix_qr_code_base64}`} alt="QR Code Pix" className="aspect-square w-44 bg-background p-2" />}
    <div><h3 className="font-semibold">Pix gerado</h3><p className="mt-1 text-sm text-muted-foreground">Escaneie o QR Code ou copie o código abaixo.</p><Button variant="outline" className="mt-3" onClick={async () => { await navigator.clipboard.writeText(transaction.pix_qr_code ?? ""); toast.success("Código Pix copiado"); }}><Copy />Copiar Pix</Button>{transaction.payment_expires_at && <p className="mt-2 text-xs text-muted-foreground">Válido até {new Date(transaction.payment_expires_at).toLocaleString("pt-BR")}</p>}</div>
  </div>;
}

const trackingSteps = [
  ["confirmed", "Pedido confirmado"], ["preparing", "Em separação"], ["shipped", "Enviado"], ["out_for_delivery", "Saiu para entrega"], ["delivered", "Entregue"],
] as const;

function TrackingStepper({ events, paid }: { events: Array<{ status: string }>; paid: boolean }) {
  const reached = new Set(events.map((event) => event.status));
  if (paid) reached.add("confirmed");
  let lastReached = -1;
  trackingSteps.forEach(([status], index) => { if (reached.has(status)) lastReached = Math.max(lastReached, index); });
  return <section className="surface-card p-4"><h2 className="font-semibold">Acompanhe a entrega</h2><div className="mt-4 grid gap-3 sm:grid-cols-5">{trackingSteps.map(([status, label], index) => <div key={status} className="flex items-center gap-2 sm:block"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${index <= lastReached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><p className="text-xs sm:mt-2">{label}</p></div>)}</div></section>;
}

function Shell({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main></div>; }