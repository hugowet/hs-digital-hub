import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Image,
  Mail,
  MessageCircle,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Truck,
  Video,
  WalletCards,
  XCircle,
  RefreshCw,
  Boxes,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/catalog";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { startMercadoPagoConnection } from "@/lib/payments.functions";
import { createSellerProduct } from "@/lib/products.functions";
import { processSupplierFulfillment, syncCjProducts } from "@/lib/suppliers.functions";

export const Route = createFileRoute("/vendedor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seller Center · HS Digital" },
      {
        name: "description",
        content: "Gerencie sua loja, produtos, vendas e pedidos na HS Digital.",
      },
    ],
  }),
  component: SellerCenterPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function SellerCenterPage() {
  const qc = useQueryClient();
  const startConnection = useServerFn(startMercadoPagoConnection);
  const syncCj = useServerFn(syncCjProducts);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: store, isLoading: storeLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["seller-store", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    enabled: !!store?.id,
    queryKey: ["store-products", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*, product_media(*)")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: transactions = [] } = useQuery({
    enabled: !!store?.id,
    queryKey: ["store-transactions", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: supplierIntegrations = [] } = useQuery({
    enabled: !!store?.id,
    queryKey: ["supplier-integrations", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("supplier_integrations")
        .select("provider,status,margin_percent,last_catalog_sync_at,last_stock_sync_at,last_error")
        .eq("store_id", store.id)
        .order("provider");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: cjImportJob } = useQuery({
    enabled: !!store?.id,
    queryKey: ["cj-import-job", store?.id],
    refetchInterval: (query) => (query.state.data?.status === "completed" ? false : 10_000),
    queryFn: async () => {
      if (!store?.id) return null;
      const { data, error } = await supabase
        .from("supplier_import_jobs")
        .select(
          "status,total_categories,completed_categories,imported_products,skipped_products,pause_reason",
        )
        .eq("store_id", store.id)
        .eq("provider", "cj")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [syncingCj, setSyncingCj] = useState(false);

  if (userId === undefined || (userId && storeLoading)) {
    return (
      <Shell>
        <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
      </Shell>
    );
  }

  if (!userId) {
    return (
      <Shell>
        <div className="surface-card mx-auto max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-bold">Acesse sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Faça login para gerenciar sua loja.</p>
          <Button asChild className="mt-4 w-full">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (!store) {
    return (
      <Shell>
        <div className="surface-card mx-auto max-w-md p-8 text-center">
          <StoreSetupForm
            userId={userId}
            onCreated={() => qc.invalidateQueries({ queryKey: ["seller-store"] })}
          />
        </div>
      </Shell>
    );
  }

  const approvedSales = transactions.filter((t) => t.status === "approved");
  const totalNet = approvedSales.reduce((sum, t) => sum + Number(t.seller_amount), 0);

  return (
    <Shell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">Painel do vendedor · HS Digital</p>
        </div>
        <div className="flex gap-2">
          {store.mercado_pago_status === "connected" ? (
            <span className="rounded-md bg-success/10 px-3 py-2 text-sm font-semibold text-success">
              Mercado Pago Conectado
            </span>
          ) : (
            <Button
              onClick={async () => {
                try {
                  const result = await startConnection({
                    data: { storeId: store.id, origin: window.location.origin },
                  });
                  window.location.assign(result.url);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Não foi possível conectar.",
                  );
                }
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Conectar Mercado Pago
            </Button>
          )}
        </div>
      </header>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="surface-card p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo Líquido</p>
            <p className="text-xl font-bold text-success">{brl(totalNet)}</p>
          </div>
        </div>
        <div className="surface-card p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vendas Aprovadas</p>
            <p className="text-xl font-bold">{approvedSales.length}</p>
          </div>
        </div>
        <div className="surface-card p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Produtos Ativos</p>
            <p className="text-xl font-bold">{products.length}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="orders" className="mt-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto border-b">
          <TabsTrigger value="orders">Pedidos e Envios</TabsTrigger>
          <TabsTrigger value="products">Meus produtos</TabsTrigger>
          <TabsTrigger value="create">Cadastrar produto</TabsTrigger>
          <TabsTrigger value="sales">Vendas e extrato</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
        </TabsList>

        {/* Aba de Pedidos e Rastreio */}
        <TabsContent value="orders" className="pt-4">
          <SellerOrdersTab storeId={store.id} />
        </TabsContent>

        {/* Aba de Produtos */}
        <TabsContent value="products" className="pt-4">
          <section className="surface-card p-4">
            <h2 className="text-base font-semibold mb-4">Meus produtos ({products.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="border border-border p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {brl(Number(p.price))} · Estoque: {p.stock}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm("Remover este produto?")) return;
                      await supabase.from("products").delete().eq("id", p.id);
                      toast.success("Produto removido.");
                      qc.invalidateQueries({ queryKey: ["store-products"] });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
              )}
            </div>
          </section>
        </TabsContent>

        {/* Aba Cadastrar Produto */}
        <TabsContent value="create" className="pt-4">
          <div className="max-w-xl">
            <ProductForm
              storeId={store.id}
              onCreated={() => qc.invalidateQueries({ queryKey: ["store-products"] })}
            />
          </div>
        </TabsContent>

        {/* Aba de Vendas */}
        {/* Aba de Vendas e Extrato com Separação e Lembretes */}
        <TabsContent value="sales" className="pt-4">
          <SellerSalesManager storeId={store.id} transactions={transactions} />
        </TabsContent>

        <TabsContent value="suppliers" className="pt-4">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <Boxes className="h-5 w-5 text-primary" />
                  Fornecedores conectados
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Produtos e estoque reais da sua operação de dropshipping.
                </p>
              </div>
              <Button
                disabled={syncingCj}
                onClick={async () => {
                  try {
                    setSyncingCj(true);
                    const result = await syncCj({ data: { storeId: store.id } });
                    toast.success(
                      result.done
                        ? "Catálogo completo da CJ sincronizado."
                        : `${result.imported} produtos importados neste lote. A fila continuará automaticamente.`,
                    );
                    await Promise.all([
                      qc.invalidateQueries({ queryKey: ["store-products", store.id] }),
                      qc.invalidateQueries({ queryKey: ["supplier-integrations", store.id] }),
                      qc.invalidateQueries({ queryKey: ["cj-import-job", store.id] }),
                      qc.invalidateQueries({ queryKey: ["products"] }),
                    ]);
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Não foi possível sincronizar a CJ.",
                    );
                  } finally {
                    setSyncingCj(false);
                  }
                }}
              >
                <RefreshCw className={`h-4 w-4 ${syncingCj ? "animate-spin" : ""}`} />
                {syncingCj ? "Sincronizando…" : "Sincronizar CJ"}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {supplierIntegrations.map((integration) => (
                <div key={integration.provider} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <strong>
                      {integration.provider === "cj" ? "CJ Dropshipping" : "Dropi Nacional"}
                    </strong>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${integration.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                    >
                      {integration.status === "active" ? "Ativo" : "Aguardando acesso"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Margem aplicada: {Number(integration.margin_percent).toLocaleString("pt-BR")}%
                  </p>
                  {integration.last_stock_sync_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estoque atualizado em{" "}
                      {new Date(integration.last_stock_sync_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                  {integration.provider === "dropi" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      A ativação depende das credenciais de parceiro fornecidas diretamente pelo
                      Dropi.
                    </p>
                  )}
                  {integration.provider === "cj" && cjImportJob && (
                    <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      <p>
                        {cjImportJob.completed_categories} de {cjImportJob.total_categories}{" "}
                        categorias concluídas
                      </p>
                      <p className="mt-1">
                        {cjImportJob.imported_products} produtos processados · Estado:{" "}
                        {cjImportJob.status === "completed"
                          ? "concluído"
                          : cjImportJob.status === "paused"
                            ? "pausado"
                            : "em andamento"}
                      </p>
                      {cjImportJob.pause_reason && (
                        <p className="mt-1 text-destructive">{cjImportJob.pause_reason}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

function SellerSalesManager({ storeId, transactions }: { storeId: string; transactions: any[] }) {
  const [salesSubTab, setSalesSubTab] = useState<"pending" | "approved" | "cancelled">("pending");

  // Buscar pedidos com itens desta loja para obter dados de contato e prazos
  const { data: salesOrders = [], isLoading } = useQuery({
    queryKey: ["seller-sales-orders", storeId],
    queryFn: async () => {
      const { data: items } = await supabase
        .from("order_items")
        .select("order_id,title,quantity,unit_price,seller_amount")
        .eq("store_id", storeId);
      if (!items || items.length === 0) return [];

      const orderIds = Array.from(new Set(items.map((i) => i.order_id)));
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id,created_at,payment_status,status,total,shipping_address")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      return (ordersData ?? []).map((ord) => ({
        ...ord,
        items: items.filter((i) => i.order_id === ord.id),
      }));
    },
  });

  const now = Date.now();

  // Classificação dos pedidos
  const pendingOrders = salesOrders.filter((o) => {
    const isPaid = o.payment_status === "approved" || o.status === "paid";
    const isCancelled = o.status === "cancelled" || o.payment_status === "failed";
    const hoursOld = (now - new Date(o.created_at).getTime()) / (1000 * 60 * 60);
    // Se ainda não pagou e tem menos de 72 horas
    return !isPaid && !isCancelled && hoursOld < 72;
  });

  const approvedOrders = salesOrders.filter(
    (o) => o.payment_status === "approved" || o.status === "paid",
  );

  const cancelledOrders = salesOrders.filter((o) => {
    const isPaid = o.payment_status === "approved" || o.status === "paid";
    const isExplicitlyCancelled = o.status === "cancelled" || o.payment_status === "failed";
    const hoursOld = (now - new Date(o.created_at).getTime()) / (1000 * 60 * 60);
    // Cancelado pelo sistema ou Pix expirou após 72 horas
    return !isPaid && (isExplicitlyCancelled || hoursOld >= 72);
  });

  const sendWhatsAppReminder = (ord: any) => {
    const addr = ord.shipping_address as Record<string, any> | null;
    const rawPhone = addr?.["phone"] || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("O cliente não informou telefone no cadastro.");
      return;
    }
    const targetPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const buyerName = addr?.["name"] || addr?.["recipient_name"] || "Cliente";
    const orderNum = ord.id.slice(0, 8).toUpperCase();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://hs-digital-hub.lovable.app";
    const payUrl = `${origin}/pedido/${ord.id}`;

    const text = `Olá, ${buyerName}! Tudo bem? 😃

Identificamos seu pedido #${orderNum} na HS Digital no valor de ${brl(Number(ord.total))}, que está aguardando a confirmação do pagamento via Pix.

⏰ Sua reserva e o estoque ficam garantidos por até 72 horas!

Você pode acessar o link do pedido para pagar ou copiar o código Pix aqui:
👉 ${payUrl}

Se tiver qualquer dúvida ou precisar de ajuda para concluir, basta responder esta mensagem. Abraço da equipe HS Digital!`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, "_blank");
    toast.success("Mensagem do WhatsApp aberta!");
  };

  const sendEmailReminder = (ord: any) => {
    const addr = ord.shipping_address as Record<string, any> | null;
    const buyerEmail = addr?.["email"] || "";
    const buyerName = addr?.["name"] || addr?.["recipient_name"] || "Cliente";
    const orderNum = ord.id.slice(0, 8).toUpperCase();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://hs-digital-hub.lovable.app";
    const payUrl = `${origin}/pedido/${ord.id}`;

    const subject = `Lembrete de Pagamento Pix - Pedido #${orderNum} - HS Digital`;
    const body = `Olá ${buyerName},

Seu pedido #${orderNum} na HS Digital está aguardando o pagamento do Pix no valor de ${brl(Number(ord.total))}.

Lembramos que sua reserva é válida por até 72 horas. Após esse período, o pedido é cancelado e o produto volta para a loja.

Para concluir seu pagamento com segurança, acesse o link abaixo:
${payUrl}

Qualquer dúvida, conte conosco!
Equipe HS Digital`;

    window.location.href = `mailto:${buyerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success("E-mail de lembrete preparado no seu aplicativo!");
  };

  return (
    <div className="space-y-4">
      {/* Sub-abas de status */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant={salesSubTab === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setSalesSubTab("pending")}
          className="gap-2"
        >
          <Clock className="h-4 w-4 text-amber-500" />
          Aguardando Pagamento ({pendingOrders.length})
        </Button>
        <Button
          variant={salesSubTab === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setSalesSubTab("approved")}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Pagos ({approvedOrders.length})
        </Button>
        <Button
          variant={salesSubTab === "cancelled" ? "default" : "outline"}
          size="sm"
          onClick={() => setSalesSubTab("cancelled")}
          className="gap-2"
        >
          <XCircle className="h-4 w-4 text-rose-500" />
          Cancelados / Expirados ({cancelledOrders.length})
        </Button>
      </div>

      {isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando transações...</p>
      )}

      {/* 1. ABA AGUARDANDO PAGAMENTO */}
      {salesSubTab === "pending" && !isLoading && (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Clientes que geraram o código Pix. O estoque fica reservado por até{" "}
              <strong>72 horas</strong>. Envie um lembrete para recuperar a venda antes de expirar!
            </span>
          </div>

          {pendingOrders.map((ord) => {
            const addr = ord.shipping_address as Record<string, any> | null;
            const hoursOld = (now - new Date(ord.created_at).getTime()) / (1000 * 60 * 60);
            const hoursLeft = Math.max(0, Math.ceil(72 - hoursOld));

            return (
              <div
                key={ord.id}
                className="surface-card p-4 border border-border rounded-xl space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Pedido #{ord.id.slice(0, 8).toUpperCase()}
                    </span>
                    <p className="text-sm font-semibold">
                      {new Date(ord.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {hoursOld >= 1 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        ⚡ +1h pendente: Enviar lembrete
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      Expira em {hoursLeft}h
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {brl(Number(ord.total))}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <p>
                      <strong>Cliente:</strong>{" "}
                      {addr?.["name"] || addr?.["recipient_name"] || "Cliente"}{" "}
                      {addr?.["phone"] ? `· 📞 ${addr["phone"]}` : ""}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {ord.items.map((i: any) => `${i.quantity}x ${i.title}`).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs"
                      onClick={() => sendWhatsAppReminder(ord)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Lembrar no WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() => sendEmailReminder(ord)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Lembrar por E-mail
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {pendingOrders.length === 0 && (
            <div className="surface-card p-8 text-center text-sm text-muted-foreground">
              Nenhum Pix aguardando pagamento no momento.
            </div>
          )}
        </div>
      )}

      {/* 2. ABA PAGOS */}
      {salesSubTab === "approved" && !isLoading && (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="p-3">Pedido</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Total Pedido</th>
                  <th className="p-3 text-right">Comissão HS Digital</th>
                  <th className="p-3 text-right">Líquido Vendedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {approvedOrders.map((ord) => {
                  const tx = transactions.find((t) => t.order_id === ord.id);
                  const gross = tx ? Number(tx.gross_amount) : Number(ord.total);
                  const fee = tx ? Number(tx.platform_fee) : 0;
                  const net = tx ? Number(tx.seller_amount) : gross - fee;

                  return (
                    <tr key={ord.id}>
                      <td className="p-3 font-medium">#{ord.id.slice(0, 8).toUpperCase()}</td>
                      <td className="p-3">
                        {new Date(ord.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Pago
                        </span>
                      </td>
                      <td className="p-3 text-right">{brl(gross)}</td>
                      <td className="p-3 text-right text-muted-foreground">-{brl(fee)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {brl(net)}
                      </td>
                    </tr>
                  );
                })}
                {approvedOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Nenhuma venda paga registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ABA CANCELADOS / EXPIRADOS (24H) */}
      {salesSubTab === "cancelled" && !isLoading && (
        <div className="space-y-3">
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Pedidos cancelados pelo cliente ou cujo Pix expirou após 72 horas sem pagamento. O
              estoque reservado foi liberado novamente para venda.
            </span>
          </div>

          {cancelledOrders.map((ord) => {
            const addr = ord.shipping_address as Record<string, any> | null;
            const hoursOld = (now - new Date(ord.created_at).getTime()) / (1000 * 60 * 60);

            return (
              <div
                key={ord.id}
                className="surface-card p-4 border border-border rounded-xl space-y-2 opacity-80"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Pedido #{ord.id.slice(0, 8).toUpperCase()}
                    </span>
                    <p className="text-sm font-semibold">
                      {new Date(ord.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <XCircle className="h-3 w-3" />
                      {hoursOld >= 72 && ord.status !== "cancelled"
                        ? "Expirado (+72h)"
                        : "Cancelado"}
                    </span>
                    <span className="text-sm font-bold line-through text-muted-foreground">
                      {brl(Number(ord.total))}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Cliente: {addr?.["name"] || addr?.["recipient_name"] || "Cliente"}</span>
                  <span className="text-emerald-600 font-medium">
                    ✓ Estoque estornado e disponível
                  </span>
                </div>
              </div>
            );
          })}

          {cancelledOrders.length === 0 && (
            <div className="surface-card p-8 text-center text-sm text-muted-foreground">
              Nenhuma compra cancelada ou expirada.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function StoreSetupForm({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const { error } = await supabase.from("stores").insert({
        owner_id: userId,
        name: name.trim(),
        slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
        description: description.trim(),
      });
      if (error) throw error;
      toast.success("Loja criada com sucesso!");
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar loja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <h2 className="text-lg font-bold">Criar minha Loja</h2>
      <div>
        <Label htmlFor="s-name">Nome da Loja</Label>
        <Input
          id="s-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ex: Minha Loja Tech"
        />
      </div>
      <div>
        <Label htmlFor="s-desc">Descrição</Label>
        <Input
          id="s-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve resumo da loja"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Criando..." : "Começar a Vender"}
      </Button>
    </form>
  );
}

function ProductForm({ storeId, onCreated }: { storeId: string; onCreated: () => void }) {
  const createProduct = useServerFn(createSellerProduct);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [category, setCategory] = useState<string>(CATEGORIES[0].slug);
  const [productType, setProductType] = useState<"physical" | "digital">("physical");
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsedPrice = parseFloat(price.replace(",", "."));
      const parsedStock = parseInt(stock, 10);
      const uploaded: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const ext = file.name.split(".").pop();
        const path = `${storeId}/${Date.now()}-${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(path, file);
        if (uploadErr) throw uploadErr;
        uploaded.push({
          storagePath: path,
          mediaType: file.type.startsWith("video/") ? "video" : "image",
          mimeType: file.type,
          sizeBytes: file.size,
          position: i,
        });
      }

      await createProduct({
        data: {
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          stock: parsedStock,
          category,
          productType,
          deliveryUrl: deliveryUrl.trim(),
          media: uploaded,
        },
      });

      toast.success("Produto cadastrado!");
      setTitle("");
      setDescription("");
      setPrice("");
      setFiles([]);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar produto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
      <h2 className="text-base font-semibold">Novo Produto</h2>
      <div>
        <Label htmlFor="p-title">Nome do Produto</Label>
        <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-price">Preço (R$)</Label>
          <Input
            id="p-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0,00"
          />
        </div>
        <div>
          <Label htmlFor="p-stock">Estoque</Label>
          <Input
            id="p-stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="p-cat">Categoria</Label>
        <select
          id="p-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-10 px-3 border rounded-md bg-background text-sm mt-1"
        >
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="p-desc">Descrição</Label>
        <Textarea
          id="p-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Detalhes do produto"
        />
      </div>
      <div>
        <Label htmlFor="p-type">Tipo de Produto</Label>
        <select
          id="p-type"
          value={productType}
          onChange={(e) => setProductType(e.target.value as any)}
          className="w-full h-10 px-3 border rounded-md bg-background text-sm mt-1"
        >
          <option value="physical">Físico (Correios / Entrega)</option>
          <option value="digital">Digital (Download / Link direto)</option>
        </select>
      </div>
      {productType === "digital" && (
        <div>
          <Label htmlFor="p-url">Link de Entrega / Download</Label>
          <Input
            id="p-url"
            value={deliveryUrl}
            onChange={(e) => setDeliveryUrl(e.target.value)}
            placeholder="https://..."
            required
          />
        </div>
      )}
      <div>
        <Label htmlFor="p-files">Fotos (até 10)</Label>
        <Input
          id="p-files"
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Cadastrando..." : "Publicar Produto"}
      </Button>
    </form>
  );
}

function SellerOrdersTab({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const processFulfillment = useServerFn(processSupplierFulfillment);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingNote, setTrackingNote] = useState<Record<string, string>>({});
  const [orderFilter, setOrderFilter] = useState<"paid" | "pending" | "all">("paid");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["seller-orders", storeId],
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("order_id,title,quantity,unit_price,seller_amount")
        .eq("store_id", storeId);
      if (itemsError) throw itemsError;
      if (!items || items.length === 0) return [];

      const orderIds = Array.from(new Set(items.map((i) => i.order_id)));
      const [{ data: ordersData }, { data: trackingEvents }, { data: fulfillments }] =
        await Promise.all([
          supabase
            .from("orders")
            .select("id,created_at,payment_status,total,shipping_address")
            .in("id", orderIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("order_tracking_events")
            .select("order_id,status,note,created_at")
            .in("order_id", orderIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("supplier_fulfillments")
            .select("id,order_id,provider,status,external_order_id,tracking_code,last_error")
            .eq("store_id", storeId)
            .in("order_id", orderIds),
        ]);

      return (ordersData ?? []).map((ord) => ({
        ...ord,
        items: items.filter((i) => i.order_id === ord.id),
        events: (trackingEvents ?? []).filter((e) => e.order_id === ord.id),
        fulfillments: (fulfillments ?? []).filter((item) => item.order_id === ord.id),
      }));
    },
  });

  const addStatus = async (orderId: string, status: string, defaultNote: string) => {
    try {
      setUpdatingId(orderId);
      const note = trackingNote[orderId]?.trim() || defaultNote;
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Você precisa estar autenticado.");

      const { error } = await supabase.from("order_tracking_events").insert({
        order_id: orderId,
        status,
        note,
        created_by: user.user.id,
      });
      if (error) throw error;

      toast.success("Status atualizado!");
      setTrackingNote((prev) => ({ ...prev, [orderId]: "" }));
      await qc.invalidateQueries({ queryKey: ["seller-orders", storeId] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Carregando pedidos...</p>;

  const paidOrders = orders.filter((o) => o.payment_status === "approved");
  const pendingOrders = orders.filter((o) => o.payment_status !== "approved");
  const displayedOrders =
    orderFilter === "paid" ? paidOrders : orderFilter === "pending" ? pendingOrders : orders;

  return (
    <div className="space-y-4">
      {/* Filtros de Pedidos Pagos vs Aguardando Pagamento */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant={orderFilter === "paid" ? "default" : "outline"}
          size="sm"
          onClick={() => setOrderFilter("paid")}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Pagos e Prontos para Envio ({paidOrders.length})
        </Button>
        <Button
          variant={orderFilter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setOrderFilter("pending")}
          className="gap-2"
        >
          <Clock className="h-4 w-4 text-amber-500" />
          Aguardando Pagamento ({pendingOrders.length})
        </Button>
        <Button
          variant={orderFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setOrderFilter("all")}
          className="gap-2"
        >
          Todos os Pedidos ({orders.length})
        </Button>
      </div>

      {displayedOrders.map((ord) => {
        const addr = ord.shipping_address as Record<string, any> | null;
        const lastEvent = ord.events.at(-1)?.status ?? "confirmed";

        return (
          <div key={ord.id} className="surface-card p-5 border border-border rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="text-xs text-muted-foreground">
                  Pedido #{ord.id.slice(0, 8).toUpperCase()}
                </span>
                <p className="text-sm font-semibold">
                  {new Date(ord.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 text-xs rounded-full font-semibold ${ord.payment_status === "approved" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}
                >
                  {ord.payment_status === "approved" ? "PAGO" : "AGUARDANDO PAGAMENTO"}
                </span>
                <span className="px-2.5 py-1 text-xs rounded-full bg-muted font-medium capitalize">
                  {lastEvent === "confirmed" && "Confirmado"}
                  {lastEvent === "preparing" && "Em separação"}
                  {lastEvent === "shipped" && "Enviado"}
                  {lastEvent === "out_for_delivery" && "Saiu para entrega"}
                  {lastEvent === "delivered" && "Entregue"}
                </span>
              </div>
            </div>

            {/* Endereço completo para postagem nos Correios */}
            {addr && (
              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  📦 Endereço de Entrega do Cliente (para os Correios):
                </p>
                <p>
                  <strong>Destinatário:</strong>{" "}
                  {addr["name"] || addr["recipient_name"] || "Cliente"} · Tel:{" "}
                  {addr["phone"] || "Não informado"}
                </p>
                <p>
                  <strong>Endereço:</strong> {addr["address"] || addr["street_address"]}
                  {addr["complement"] ? `, ${addr["complement"]}` : ""} - {addr["city"]}
                </p>
              </div>
            )}

            {/* Itens do pedido */}
            <div className="space-y-1 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Itens:</p>
              {ord.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>
                    {i.quantity}x {i.title}
                  </span>
                  <span className="font-semibold text-success">{brl(Number(i.seller_amount))}</span>
                </div>
              ))}
            </div>

            {/* Atualização de etapas e código de rastreio */}
            {ord.fulfillments.map((fulfillment) => (
              <div
                key={fulfillment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs"
              >
                <span>
                  <strong>{fulfillment.provider === "cj" ? "CJ Dropshipping" : "Dropi"}</strong> ·{" "}
                  {fulfillment.status === "submitted"
                    ? "Pedido enviado"
                    : fulfillment.status === "failed"
                      ? "Falha no envio"
                      : "Aguardando envio"}
                  {fulfillment.tracking_code ? ` · Rastreio ${fulfillment.tracking_code}` : ""}
                </span>
                {fulfillment.provider === "cj" &&
                  ["pending", "retry", "failed"].includes(fulfillment.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await processFulfillment({
                            data: { fulfillmentId: fulfillment.id, storeId },
                          });
                          toast.success("Pedido encaminhado à CJ Dropshipping.");
                          await qc.invalidateQueries({ queryKey: ["seller-orders", storeId] });
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Não foi possível encaminhar o pedido.",
                          );
                        }
                      }}
                    >
                      Enviar agora
                    </Button>
                  )}
              </div>
            ))}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Atualizar envio nos Correios:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={lastEvent === "preparing" ? "secondary" : "outline"}
                  disabled={updatingId === ord.id}
                  onClick={() => addStatus(ord.id, "preparing", "Pedido em separação para envio")}
                >
                  Em separação
                </Button>

                <div className="flex flex-1 min-w-[240px] gap-1">
                  <Input
                    placeholder="Código de rastreio Correios (ex: AA123456789BR)"
                    value={trackingNote[ord.id] || ""}
                    onChange={(e) => setTrackingNote({ ...trackingNote, [ord.id]: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={updatingId === ord.id}
                    onClick={() =>
                      addStatus(
                        ord.id,
                        "shipped",
                        trackingNote[ord.id]
                          ? `Rastreio Correios: ${trackingNote[ord.id]}`
                          : "Objeto postado nos Correios",
                      )
                    }
                  >
                    Marcar Enviado
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === ord.id}
                  onClick={() =>
                    addStatus(
                      ord.id,
                      "out_for_delivery",
                      "Objeto saiu para entrega ao destinatário",
                    )
                  }
                >
                  Saiu para entrega
                </Button>

                <Button
                  size="sm"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  disabled={updatingId === ord.id}
                  onClick={() => addStatus(ord.id, "delivered", "Objeto entregue ao cliente")}
                >
                  Entregue
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {displayedOrders.length === 0 && (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {orderFilter === "paid"
            ? "Nenhum pedido pago aguardando envio no momento."
            : orderFilter === "pending"
              ? "Nenhum pedido aguardando pagamento no momento."
              : "Nenhum pedido registrado nesta loja."}
        </div>
      )}
    </div>
  );
}
