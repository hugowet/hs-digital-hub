import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gift,
  Package,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { OrderPhoto, OrderTracking } from "@/components/order-tracking";
import { getBuyerOrderPhotos } from "@/lib/shipping.functions";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { cancelUnpaidMarketplaceOrder } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/compras")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Minhas Compras · HS Digital" },
      { name: "description", content: "Acompanhe seus pedidos, entregas, avaliações e missões de frete grátis." },
      { property: "og:title", content: "Minhas Compras · HS Digital" },
      { property: "og:description", content: "Acompanhe seus pedidos, entregas, avaliações e missões de frete grátis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PurchasesPage,
});

export function PurchasesPage() {
  const qc = useQueryClient();
  const cancelOrder = useServerFn(cancelUnpaidMarketplaceOrder);
  const loadPhotos = useServerFn(getBuyerOrderPhotos);

  const [mainTab, setMainTab] = useState<"processadas" | "pendentes">("processadas");
  const [showMissions, setShowMissions] = useState(false);

  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPlatformRating, setReviewPlatformRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-purchases-detailed"],
    queryFn: async () => {
      const { data: identity, error: identityError } = await supabase.auth.getUser();
      if (identityError) throw identityError;
      if (!identity.user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          total,
          status,
          payment_status,
          shipping_address,
          created_at,
          order_tracking_events(status,note,created_at),
          supplier_fulfillments(tracking_code,tracking_carrier,supplier_expected_delivery),
          order_items (
            id,
            title,
            quantity,
            unit_price,
            product_id
          )
        `,
        )
        .eq("buyer_id", identity.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 15000,
  });

  const productIds = [...new Set(orders.flatMap(order => order.order_items.map((item: any) => item.product_id).filter(Boolean)))] as string[];
  const { data: photos = [] } = useQuery({
    queryKey: ["buyer-order-photos", productIds.join(",")],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const batches = [];
      for (let i = 0; i < productIds.length; i += 500) batches.push(await loadPhotos({ data: { productIds: productIds.slice(i, i + 500) } }));
      return batches.flat();
    },
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
  });
  useEffect(() => {
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["my-purchases-detailed"] }); };
    const channel = supabase.channel(`buyer-purchases-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_tracking_events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "supplier_fulfillments" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);

  const handleSaveReview = () => {
    if (!reviewOrder) return;
    try {
      const existingReviews = JSON.parse(localStorage.getItem("hs_buyer_reviews") || "{}");
      existingReviews[reviewOrder.id] = {
        rating: reviewRating,
        platformRating: reviewPlatformRating,
        comment: reviewComment,
        date: new Date().toISOString(),
      };
      localStorage.setItem("hs_buyer_reviews", JSON.stringify(existingReviews));
      toast.success("Obrigado pelo seu feedback! Sua avaliação foi registrada.");
      setReviewOrder(null);
      setReviewComment("");
    } catch {
      toast.error("Erro ao salvar avaliação.");
    }
  };

  const processedOrders = orders.filter((o) => o.payment_status === "approved" && o.status !== "cancelled");

  const pendingOrders = orders.filter((o) => {
    if (o.payment_status === "approved") return false;
    const diffHours = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60);
    return o.status === "awaiting_payment" && diffHours < 72;
  });

  const cancelledOrders = orders.filter((o) => {
    if (o.status === "cancelled" || o.payment_status === "failed") return true;
    const diffHours = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60);
    return o.payment_status !== "approved" && diffHours >= 72;
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">Minhas Compras</h1>
              <p className="text-sm text-muted-foreground">Acompanhe o status dos seus pedidos, entregas e suporte.</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="flex items-center gap-2 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
            onClick={() => setShowMissions(!showMissions)}
          >
            <Gift className="h-4 w-4" />
            {showMissions ? "Fechar Missões" : "Missões de Frete Grátis"}
          </Button>
        </div>

        {showMissions && (
          <section className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-bold">Missões HS Digital: Ganhe Frete Grátis! 🚀</h2>
                <p className="text-xs text-muted-foreground">
                  Complete pequenas tarefas para desbloquear cupons exclusivos de frete grátis na sua conta.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-primary">Missão 1</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <h3 className="mt-2 text-sm font-bold">Primeira Compra</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Faça qualquer compra no marketplace para liberar seu primeiro cupom.
                </p>
                <div className="mt-3">
                  <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs font-mono font-bold text-foreground">
                    CUPOM: FRETEPRIMEIRA
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-primary">Missão 2</span>
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
                <h3 className="mt-2 text-sm font-bold">Avaliar Produto</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deixe uma avaliação de 5 estrelas e comentário em uma compra recebida.
                </p>
                <div className="mt-3">
                  <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs font-mono font-bold text-foreground">
                    CUPOM: FRETEFEEDBACK
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-primary">Missão 3</span>
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="mt-2 text-sm font-bold">Completar Perfil</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cadastre seu endereço e telefone para agilizar suas entregas.
                </p>
                <div className="mt-3">
                  <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs font-mono font-bold text-foreground">
                    CUPOM: CLIENTEHS
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {reviewOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Avaliar Pedido #{reviewOrder.id.slice(0, 8).toUpperCase()}</h3>
                <Button variant="ghost" size="sm" onClick={() => setReviewOrder(null)}>
                  ✕
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Avaliação dos Produtos Comprados:</Label>
                  <div className="mt-1 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-bold text-amber-500">{reviewRating} de 5</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Avaliação da Experiência na Plataforma HS Digital:
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewPlatformRating(star)}
                        className="p-1 focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${star <= reviewPlatformRating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-bold text-primary">{reviewPlatformRating} de 5</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="review-comment">Seu comentário ou elogio:</Label>
                  <Textarea
                    id="review-comment"
                    placeholder="Conte o que achou da agilidade, do produto e do atendimento..."
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setReviewOrder(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveReview}>Enviar Avaliação</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="flex flex-wrap border-b border-border">
            <button
              onClick={() => setMainTab("processadas")}
              className={`flex items-center gap-2 border-b-2 px-6 py-3 font-semibold text-sm transition-colors ${
                mainTab === "processadas"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Compras Processadas (Pagas)
              <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 font-bold">
                {processedOrders.length}
              </span>
            </button>

            <button
              onClick={() => setMainTab("pendentes")}
              className={`flex items-center gap-2 border-b-2 px-6 py-3 font-semibold text-sm transition-colors ${
                mainTab === "pendentes"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-4 w-4" />
              Compras Pendentes / Canceladas
              <span className="ml-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 font-bold">
                {pendingOrders.length + cancelledOrders.length}
              </span>
            </button>
          </div>

          {isLoading ? (
            <div className="mt-8 space-y-4">
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : (
            <div className="mt-6">
              {mainTab === "processadas" && (
                <div>
                  {processedOrders.length === 0 ? (
                    <div className="surface-card p-12 text-center">
                      <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-base font-bold">Nenhuma compra paga no momento</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Quando seu pagamento for aprovado, ele aparecerá aqui com rastreamento.
                      </p>
                      <Button asChild className="mt-4">
                        <Link to="/">Explorar catálogo</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {processedOrders.map((order) => (
                        <article
                          key={order.id}
                          className="surface-card overflow-hidden rounded-md border border-border p-4 sm:p-6 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-muted-foreground">
                                  PEDIDO #{order.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                                  Pagamento Aprovado
                                </span>
                              </div>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {new Date(order.created_at).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Total Pago</p>
                              <p className="text-lg font-bold text-primary">{brl(Number(order.total))}</p>
                            </div>
                          </div>

                          <Tabs defaultValue="pedido" className="mt-4">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="pedido" className="text-xs sm:text-sm">
                                <Package className="mr-1.5 hidden h-4 w-4 sm:block" /> Produtos
                              </TabsTrigger>
                              <TabsTrigger value="rastreio" className="text-xs sm:text-sm">
                                <Truck className="mr-1.5 hidden h-4 w-4 sm:block" /> Entrega
                              </TabsTrigger>
                              <TabsTrigger value="devolucao" className="text-xs sm:text-sm">
                                <RotateCcw className="mr-1.5 hidden h-4 w-4 sm:block" /> Garantia
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="pedido" className="pt-4 space-y-4">
                              <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                  Itens Comprados:
                                </h4>
                                <div className="divide-y divide-border rounded-xl border border-border bg-card p-3">
                                  {order.order_items.map((item: any) => (
                                    <div key={item.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                                      <OrderPhoto src={photos.find(photo => photo.id === item.product_id)?.image_url} title={item.title} />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-foreground">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">Quantidade: {item.quantity}</p>
                                      </div>
                                      <p className="font-mono font-medium">
                                        {brl(Number(item.unit_price) * item.quantity)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                                  onClick={() => setReviewOrder(order)}
                                >
                                  <Star className="h-4 w-4 fill-amber-500" />
                                  Avaliar Produto e Plataforma
                                </Button>

                                <Button asChild size="sm">
                                  <Link to="/pedido/$orderId" params={{ orderId: order.id }}>
                                    Acompanhar pedido <ChevronRight className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </TabsContent>

                            <TabsContent value="rastreio" className="pt-4">
                              <OrderTracking events={order.order_tracking_events ?? []} paid={true} fulfillments={order.supplier_fulfillments ?? []} />
                              <Button asChild variant="outline" className="mt-4"><Link to="/pedido/$orderId" params={{ orderId: order.id }}>Detalhes e atendimento <ChevronRight className="h-4 w-4" /></Link></Button>
                            </TabsContent>

                            <TabsContent value="devolucao" className="pt-4">
                              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                  <ShieldCheck className="h-5 w-5" />
                                  <span>Garantia Legal e Políticas de Devolução (CDC)</span>
                                </div>

                                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                                    <p className="font-bold text-foreground">
                                      ⚖️ Direito de Arrependimento (Art. 49 do CDC)
                                    </p>
                                    <p className="mt-1">
                                      Você tem até <strong>7 (sete) dias corridos</strong> a partir do recebimento da
                                      mercadoria para solicitar a desistência da compra pela internet, recebendo o
                                      reembolso integral.
                                    </p>
                                  </div>

                                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                                    <p className="font-bold text-foreground">
                                      🛡️ Garantia Contra Defeitos de Fabricação
                                    </p>
                                    <p className="mt-1">
                                      Garantia legal de <strong>30 dias</strong> para produtos não duráveis e{" "}
                                      <strong>90 dias</strong> para produtos duráveis em caso de vício ou defeito não
                                      decorrente do mau uso.
                                    </p>
                                  </div>

                                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                                    <p className="font-bold text-foreground">📦 Condições para Devolução</p>
                                    <p className="mt-1">
                                      O produto deve ser devolvido na embalagem original, com todos os manuais,
                                      acessórios e sem sinais de violação ou avarias causadas por queda ou uso
                                      incorreto.
                                    </p>
                                  </div>
                                </div>

                                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border">
                                  <p className="text-xs text-muted-foreground">Precisa de mediação ou devolução?</p>
                                  <Button asChild variant="outline" size="sm">
                                    <Link to="/pedido/$orderId" params={{ orderId: order.id }}>
                                      Abrir Chamado com o Vendedor <ChevronRight className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {mainTab === "pendentes" && (
                <Tabs defaultValue="aguardando" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="aguardando" className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Aguardando Pagamento ({pendingOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="canceladas" className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Canceladas / Expiradas ({cancelledOrders.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="aguardando" className="mt-6 space-y-4">
                    {pendingOrders.length === 0 ? (
                      <div className="surface-card p-10 text-center">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                        <h3 className="mt-3 text-sm font-bold">Nenhum pagamento pendente</h3>
                        <p className="text-xs text-muted-foreground">
                          Todos os seus pedidos ativos já foram pagos ou concluídos.
                        </p>
                      </div>
                    ) : (
                      pendingOrders.map((order) => {
                        const hoursElapsed = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
                        const hoursRemaining = Math.max(0, 72 - hoursElapsed);

                        return (
                          <article
                            key={order.id}
                            className="surface-card rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold">
                                    PEDIDO #{order.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                                    Aguardando Pix / Pagamento
                                  </span>
                                </div>
                                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                                  Expira em aproximadamente {Math.floor(hoursRemaining)}h{" "}
                                  {Math.floor((hoursRemaining % 1) * 60)}m (prazo de 72h)
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Valor a Pagar</p>
                                <p className="text-lg font-bold text-primary">{brl(Number(order.total))}</p>
                              </div>
                            </div>

                            <div className="mt-4 border-t border-border pt-3">
                              <div className="space-y-3">{order.order_items.map((item: any) => <div key={item.id} className="flex items-center gap-3"><OrderPhoto src={photos.find(photo => photo.id === item.product_id)?.image_url} title={item.title} /><p className="min-w-0 text-sm">{item.quantity}x {item.title}</p></div>)}</div>

                              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={async () => {
                                    if (!window.confirm("Deseja realmente cancelar este pedido e liberar os produtos?"))
                                      return;
                                    try {
                                      await cancelOrder({ data: { orderId: order.id } });
                                      toast.success("Pedido cancelado com sucesso.");
                                      await qc.invalidateQueries({ queryKey: ["my-purchases-detailed"] });
                                    } catch (err: any) {
                                      toast.error(err.message || "Erro ao cancelar pedido.");
                                    }
                                  }}
                                >
                                  <Trash2 className="mr-1.5 h-4 w-4" /> Cancelar Pedido
                                </Button>

                                <Button asChild size="sm">
                                  <Link to="/pedido/$orderId" params={{ orderId: order.id }}>
                                    Copiar Pix / Efetuar Pagamento <ChevronRight className="ml-1 h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </TabsContent>

                  <TabsContent value="canceladas" className="mt-6 space-y-4">
                    {cancelledOrders.length === 0 ? (
                      <div className="surface-card p-10 text-center">
                        <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-3 text-sm font-bold">Nenhum pedido cancelado</h3>
                      </div>
                    ) : (
                      cancelledOrders.map((order) => (
                        <article
                          key={order.id}
                          className="surface-card rounded-2xl border border-border p-5 opacity-80"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-muted-foreground">
                                  PEDIDO #{order.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
                                  Cancelado / Expirado
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Realizado em {new Date(order.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-muted-foreground">{brl(Number(order.total))}</p>
                            </div>
                          </div>

                          <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                            {order.order_items.map((item: any) => <div key={item.id} className="flex items-center gap-3 py-2"><OrderPhoto src={photos.find(photo => photo.id === item.product_id)?.image_url} title={item.title} /><span>{item.quantity}x {item.title}</span></div>)}
                          </div>
                        </article>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
