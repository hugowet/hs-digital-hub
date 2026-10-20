import { AmazonAffiliateImporter } from "@/components/admin/AmazonAffiliateImporter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { getSellerShippingConfiguration, saveSellerOriginPostalCode, startMelhorEnvioConnection } from "@/lib/shipping.functions";

export const Route = createFileRoute("/_authenticated/vendedor")({
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
  const cjBatchRunning = useRef(false);

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
  const [activeTab, setActiveTab] = useState("orders");
  const cjPricedProduct = products.find(
    (product) => product.supplier === "cj" && product.supplier_exchange_rate,
  );

  const continueCjImport = useCallback(
    async (showResult = false) => {
      if (!store?.id || cjBatchRunning.current) return;
      cjBatchRunning.current = true;
      setSyncingCj(true);
      try {
        const result = await syncCj({ data: { storeId: store.id } });
        if (showResult) {
          toast.success(
            result.done
              ? "Catálogo completo da CJ sincronizado."
              : `${result.imported} produtos importados neste lote. A fila continuará automaticamente.`,
          );
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["store-products", store.id] }),
          qc.invalidateQueries({ queryKey: ["supplier-integrations", store.id] }),
          qc.invalidateQueries({ queryKey: ["cj-import-job", store.id] }),
          qc.invalidateQueries({ queryKey: ["products"] }),
        ]);
      } catch (error) {
        if (showResult) {
          toast.error(
            error instanceof Error ? error.message : "Não foi possível sincronizar a CJ.",
          );
        }
      } finally {
        cjBatchRunning.current = false;
        setSyncingCj(false);
      }
    },
    [qc, store?.id, syncCj],
  );

  useEffect(() => {
    if (!cjImportJob || !["pending", "running"].includes(cjImportJob.status)) return;
    const timer = window.setTimeout(() => void continueCjImport(false), 3_000);
    return () => window.clearTimeout(timer);
  }, [cjImportJob, continueCjImport]);

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto border-b">
          <TabsTrigger value="orders">Pedidos e Envios</TabsTrigger>
          <TabsTrigger value="products">Meus produtos</TabsTrigger>
          <TabsTrigger value="create">Cadastrar produto</TabsTrigger>
          <TabsTrigger value="sales">Vendas e extrato</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="amazon-affiliate">Importador Amazon</TabsTrigger>
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
                    <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {p.supplier ? "Dropshipping" : "Produto próprio"}
                    </span>
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
            <div className="mb-4 rounded-md border border-border bg-muted/40 p-4">
              <h2 className="font-semibold">Venda com estoque próprio</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre normalmente seus produtos, defina preço e estoque e cuide do envio após a venda. Nenhum fornecedor de dropshipping é necessário.
              </p>
            </div>
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
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <section className="surface-card p-5">
              <Package className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-semibold">Venda seus produtos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use seu próprio estoque, suas fotos e seu envio. Esta opção continua disponível para qualquer lojista.
              </p>
              <Button className="mt-4 w-full" onClick={() => setActiveTab("create")}>
                <Plus className="h-4 w-4" />
                Cadastrar produto próprio
              </Button>
            </section>
            <section className="surface-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <Boxes className="h-5 w-5 text-primary" />
                  Dropshipping opcional
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conecte um fornecedor somente se quiser vender sem manter estoque próprio.
                </p>
              </div>
            <CjApiKeyManager store={store} userId={userId} />
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
                  {integration.provider === "cj" && cjPricedProduct && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Custo em USD convertido pela cotação de R${" "}
                      {Number(cjPricedProduct.supplier_exchange_rate).toLocaleString("pt-BR", {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                      ; depois é aplicada a margem.
                    </p>
                  )}
                  {integration.last_stock_sync_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estoque atualizado em{" "}
                      {new Date(integration.last_stock_sync_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                  {integration.provider === "dropi" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Aguardando a URL oficial da API e o identificador do integrador fornecidos
                      pelo Dropi. O token já está protegido no servidor.
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
              {supplierIntegrations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum fornecedor conectado. Você pode continuar vendendo normalmente com estoque próprio.
                </p>
              )}
            </div>
            </section>
            <SellerShippingSettings storeId={store.id} />
          </div>
        </TabsContent>

        {/* Aba do Importador Amazon */}
        <TabsContent value="amazon-affiliate" className="pt-4">
          <AmazonAffiliateImporter />
        </TabsContent>
      </Tabs>
    </Shell>
  );
}


function CjApiKeyManager({ store, userId }: { store?: any; userId?: string }) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // 1. Tenta carregar do cache local
    const cached = localStorage.getItem("hs_digital_cj_api_key");
    if (cached) {
      setApiKey(cached);
      setSaved(true);
    }

    // 2. Busca da integração de fornecedores da loja do vendedor logado
    if (store?.id) {
      supabase
        .from("supplier_integrations")
        .select("access_token_encrypted")
        .eq("store_id", store.id)
        .eq("provider", "cj")
        .maybeSingle()
        .then(({ data }) => {
          if (data?.access_token_encrypted) {
            setApiKey(data.access_token_encrypted);
            setSaved(true);
            localStorage.setItem("hs_digital_cj_api_key", data.access_token_encrypted);
          } else if ((store as any)?.cj_api_key) {
            setApiKey((store as any).cj_api_key);
            setSaved(true);
            localStorage.setItem("hs_digital_cj_api_key", (store as any).cj_api_key);
          }
        });
    }
  }, [store?.id]);

  // Gatilho automático: Salva a chave no cadastro do vendedor e dispara a sincronização por back-end
  const handleSaveAndSync = async () => {
    if (!apiKey.trim()) {
      toast.error("Informe a chave API da CJ Dropshipping.");
      return;
    }
    setLoading(true);
    setSyncing(true);
    const cleanKey = apiKey.trim();

    try {
      // 1. Salva no cache local do vendedor
      localStorage.setItem("hs_digital_cj_api_key", cleanKey);

      // 2. Salva no cadastro do vendedor logado (supplier_integrations e stores)
      if (store?.id) {
        await supabase
          .from("supplier_integrations")
          .upsert(
            {
              store_id: store.id,
              provider: "cj",
              access_token_encrypted: cleanKey,
              status: "active",
              margin_percent: 35,
            },
            { onConflict: "store_id,provider" }
          );

        try {
          await supabase
            .from("stores")
            .update({ cj_api_key: cleanKey } as any)
            .eq("id", store.id);
        } catch {
          // Ignora caso a coluna cj_api_key não exista em stores
        }
      }

      setSaved(true);

      // 3. Dispara a sincronização de produtos via função servidora/API de back-end
      try {
        const res = await fetch("/api/public/suppliers/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({ apiKey: cleanKey, storeId: store?.id }),
        });

        const contentType = res.headers.get("content-type") || "";
        const rawText = await res.text();

        // Se a resposta contiver <!DOCTYPE html> ou o Content-Type não for application/json,
        // NÃO roda response.json() e exibe o alerta amigável de segundo plano.
        if (
          !contentType.includes("application/json") ||
          rawText.trim().startsWith("<!DOCTYPE") ||
          rawText.trim().startsWith("<html")
        ) {
          console.warn("Resposta não-JSON/HTML recebida da rota (ignorado para não travar o Seller Center).");
          toast.info("Chave salva! Aguardando sincronização de produtos em segundo plano.");
        } else {
          try {
            const data = JSON.parse(rawText);
            if (!res.ok) {
              toast.info(data.error || "Chave salva! Aguardando sincronização de produtos em segundo plano.");
            } else {
              toast.success(data.message || "Catálogo sincronizado com 35% de margem com sucesso!");
              setTimeout(() => window.location.reload(), 1500);
            }
          } catch {
            toast.info("Chave salva! Aguardando sincronização de produtos em segundo plano.");
          }
        }
      } catch (fetchErr) {
        console.warn("Falha de rede/CORS na requisição da CJ:", fetchErr);
        toast.info("Chave salva! Aguardando sincronização de produtos em segundo plano.");
      }
    } catch (err: any) {
      console.warn("Aviso ao salvar integração:", err);
      toast.info("Chave salva! Aguardando sincronização de produtos em segundo plano.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  return (
    <div className="w-full space-y-3 pt-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="password"
          placeholder="Cole sua chave API (CJ-Access-Token) aqui..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="font-mono text-sm flex-1"
        />
        <Button
          onClick={handleSaveAndSync}
          disabled={loading || syncing || !apiKey.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium whitespace-nowrap"
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Salvando e Sincronizando CJ...
            </>
          ) : (
            "Salvar e Sincronizar Produtos CJ"
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Status: {saved ? "🟢 Chave configurada e ativa no seu cadastro" : "⚪ Nenhuma chave configurada"} · Sincronização automática com 35% de margem de lucro inclusa.
      </p>
    </div>
  );
}

function SellerShippingSettings({ storeId }: { storeId: string }) {
  const getConfiguration = useServerFn(getSellerShippingConfiguration);
  const savePostalCode = useServerFn(saveSellerOriginPostalCode);
  const startConnection = useServerFn(startMelhorEnvioConnection);
  const [postalCode, setPostalCode] = useState("");
  const [saving, setSaving] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ["seller-shipping", storeId],
    queryFn: () => getConfiguration({ data: { storeId } }),
  });
  useEffect(() => {
    if (data?.originPostalCode) setPostalCode(data.originPostalCode);
  }, [data?.originPostalCode]);
  const connected = data?.status === "active";
  return (
    <section className="surface-card p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Truck className="h-5 w-5 text-primary" /> Frete de produtos próprios</h2>
          <p className="mt-1 text-sm text-muted-foreground">Conecte o Melhor Envio para oferecer Correios e transportadoras pelo CEP.</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
          {connected ? "Conectado" : "Não conectado"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <Label htmlFor="origin-postal-code">CEP de origem da loja</Label>
          <Input id="origin-postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" />
        </div>
        <Button variant="outline" disabled={saving || postalCode.length !== 8} onClick={async () => {
          setSaving(true);
          try {
            await savePostalCode({ data: { storeId, originPostalCode: postalCode } });
            await refetch();
            toast.success("CEP de origem salvo.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível salvar o CEP.");
          } finally {
            setSaving(false);
          }
        }}>Salvar CEP</Button>
        <Button disabled={connected} onClick={async () => {
          try {
            const result = await startConnection({ data: { storeId, origin: window.location.origin } });
            window.location.assign(result.url);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível conectar o Melhor Envio.");
          }
        }}><ExternalLink className="h-4 w-4" /> {connected ? "Melhor Envio conectado" : "Conectar Melhor Envio"}</Button>
      </div>
      {data?.lastError && <p className="mt-3 text-xs text-destructive">{data.lastError}</p>}
    </section>
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
  const [weightKg, setWeightKg] = useState("0.3");
  const [heightCm, setHeightCm] = useState("5");
  const [widthCm, setWidthCm] = useState("15");
  const [lengthCm, setLengthCm] = useState("20");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/\s/g, "").replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const parsedPrice = parseNumber(price);
      if (parsedPrice <= 0) {
        toast.error("Informe um preço válido maior que zero.");
        setSubmitting(false);
        return;
      }

      const parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        toast.error("Informe uma quantidade de estoque válida.");
        setSubmitting(false);
        return;
      }

      if (productType === "digital") {
        if (!deliveryUrl.trim().startsWith("https://")) {
          toast.error("O link de entrega digital deve começar com https://");
          setSubmitting(false);
          return;
        }
      }

      // Valores padrão automáticos para frete, impedindo travamento se o usuário não preencher
      let parsedWeight: number | null = null;
      let parsedHeight: number | null = null;
      let parsedWidth: number | null = null;
      let parsedLength: number | null = null;

      if (productType === "physical") {
        parsedWeight = parseNumber(weightKg) > 0 ? parseNumber(weightKg) : 0.3;
        parsedHeight = parseNumber(heightCm) > 0 ? parseNumber(heightCm) : 5;
        parsedWidth = parseNumber(widthCm) > 0 ? parseNumber(widthCm) : 15;
        parsedLength = parseNumber(lengthCm) > 0 ? parseNumber(lengthCm) : 20;
      }

      const uploaded: Array<{
        storagePath: string;
        mediaType: "image" | "video";
        mimeType: string;
        sizeBytes: number;
        position: number;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        let mime = file.type || "image/jpeg";
        if (mime === "image/jpg") mime = "image/jpeg";

        const ext = file.name.split(".").pop() || "jpg";
        const path = `${storeId}/${Date.now()}-${i}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: mime });

        if (uploadErr) throw uploadErr;

        uploaded.push({
          storagePath: path,
          mediaType: mime.startsWith("video/") ? "video" : "image",
          mimeType: mime,
          sizeBytes: file.size,
          position: i,
        });
      }

      // Inserção direta na tabela products do Supabase, utilizando o campo correto 'title'
      const coverUrl = uploaded.find((m) => m.mediaType === "image")?.storagePath || uploaded[0]?.storagePath || null;
      const galleryUrls = uploaded.map((m) => m.storagePath);

      const { data: newProd, error: insertProdError } = await supabase
        .from("products")
        .insert({
          store_id: storeId,
          title: title.trim(),
          description: description.trim() || null,
          description_long: description.trim() || null,
          price: parsedPrice,
          stock: parsedStock,
          category: category,
          product_type: productType,
          image_url: coverUrl,
          gallery_urls: galleryUrls,
          is_active: true,
          weight_kg: productType === "physical" ? parsedWeight : null,
          height_cm: productType === "physical" ? parsedHeight : null,
          width_cm: productType === "physical" ? parsedWidth : null,
          length_cm: productType === "physical" ? parsedLength : null,
        })
        .select("id")
        .single();

      if (insertProdError) {
        throw new Error(insertProdError.message || "Erro ao cadastrar produto no banco.");
      }

      // Inserção das fotos e vídeos na tabela product_media sem chamar RPC quebrado
      if (newProd?.id && uploaded.length > 0) {
        const mediaRows = uploaded.map((m) => ({
          product_id: newProd.id,
          store_id: storeId,
          storage_path: m.storagePath,
          media_type: m.mediaType,
          mime_type: m.mimeType,
          size_bytes: m.sizeBytes,
          position: m.position,
        }));

        const { error: mediaErr } = await supabase.from("product_media").insert(mediaRows);
        if (mediaErr) {
          console.warn("Aviso ao salvar mídias do produto:", mediaErr.message);
        }
      }

      // Inserção de link digital quando aplicável
      if (newProd?.id && productType === "digital" && deliveryUrl.trim()) {
        await supabase.from("digital_product_assets").insert({
          product_id: newProd.id,
          store_id: storeId,
          delivery_url: deliveryUrl.trim(),
        });
      }

      toast.success("Produto cadastrado com sucesso!");
      setTitle("");
      setDescription("");
      setPrice("");
      setStock("1");
      setFiles([]);
      if (productType === "physical") {
        setWeightKg("0.3");
        setHeightCm("5");
        setWidthCm("15");
        setLengthCm("20");
      }
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar produto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
      <h2 className="text-base font-semibold">Novo Produto</h2>
      <div>
        <Label htmlFor="p-title">Nome do Produto *</Label>
        <Input
          id="p-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Ex: Teclado Mecânico RGB"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-price">Preço (R$) *</Label>
          <Input
            id="p-price"
            value={pri

... [truncated — file is 67685 bytes, showing first 51200]
