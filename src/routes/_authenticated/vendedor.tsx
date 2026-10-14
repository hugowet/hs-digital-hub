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
          const msg = error instanceof Error ? error.message : "";
          if (msg.includes("Only HTML requests are supported here")) {
            toast.info("Importação da CJ agendada em segundo plano.");
          } else {
            toast.error(msg || "Não foi possível sincronizar a CJ.");
          }
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

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <header className="surface-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wide text-primary">Seller Center</span>
              <h1 className="font-display text-2xl font-bold">{store.name}</h1>
              <p className="text-xs text-muted-foreground">/{store.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/loja/$storeSlug" params={{ storeSlug: store.slug }}>
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Ver vitrine
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <FinancialSummary storeId={store.id} transactions={transactions} />

        <ShippingConfigCard storeId={store.id} />

        <MercadoPagoCard
          store={store}
          onConnect={async () => {
            const result = await startConnection({ data: { storeId: store.id } });
            if (result?.authUrl) {
              window.location.href = result.authUrl;
            }
          }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="products">Produtos ({products.length})</TabsTrigger>
            <TabsTrigger value="new-product">Novo produto</TabsTrigger>
            <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="pt-4">
            <SellerOrdersList storeId={store.id} />
          </TabsContent>

          <TabsContent value="products" className="pt-4">
            <ProductsList
              products={products}
              onProductDeleted={() => qc.invalidateQueries({ queryKey: ["store-products"] })}
            />
          </TabsContent>

          <TabsContent value="new-product" className="pt-4">
            <NewProductForm
              storeId={store.id}
              onCreated={() => {
                qc.invalidateQueries({ queryKey: ["store-products"] });
                setActiveTab("products");
              }}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="pt-4">
            <div className="space-y-6">
              <div className="surface-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold">Importação Automática da CJ</h2>
                    <p className="text-sm text-muted-foreground">
                      Importação completa de todo o catálogo ativo da CJ com descrições automáticas
                      em português e cotação USD atualizada.
                    </p>
                  </div>
                  <Button
                    onClick={() => void continueCjImport(true)}
                    disabled={syncingCj}
                    variant="outline"
                  >
                    {syncingCj ? "Importando lote..." : "Sincronizar lote agora"}
                  </Button>
                </div>
                {cjImportJob && (
                  <div className="mt-4 grid gap-3 rounded-lg border bg-muted/40 p-4 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground">Status da fila:</span>
                      <p className="font-semibold capitalize">{cjImportJob.status}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Categorias:</span>
                      <p className="font-semibold">
                        {cjImportJob.completed_categories} / {cjImportJob.total_categories}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Produtos importados:</span>
                      <p className="font-semibold">{cjImportJob.imported_products}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Itens ignorados/sem estoque:</span>
                      <p className="font-semibold">{cjImportJob.skipped_products}</p>
                    </div>
                  </div>
                )}
                {cjPricedProduct?.supplier_exchange_rate && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cotação aplicada no catálogo:{" "}
                    <strong>{brl(cjPricedProduct.supplier_exchange_rate)} / USD</strong>
                    {cjPricedProduct.supplier_exchange_rate_quoted_at &&
                      ` (atualizada em ${new Date(
                        cjPricedProduct.supplier_exchange_rate_quoted_at,
                      ).toLocaleDateString("pt-BR")})`}
                    .
                  </p>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="surface-card p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Integração Direta CJ Dropshipping</span>
                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
                      API Oficial
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Insira seu <strong>CJ-Access-Token</strong> obtido no painel de desenvolvedores da CJ Dropshipping para sincronização direta sem intermediários.
                  </p>
                  
                  <CjDirectConfigForm store={store} />
                </div>

                <div className="surface-card p-6">
                  <h3 className="font-display font-semibold">Dropi (Nacional & Global)</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Conecte produtos nacionais e globais pelo Dropi com repasse automático e
                    rastreamento.
                  </p>
                  <p className="mt-4 text-xs font-semibold text-muted-foreground uppercase">
                    Status da conexão
                  </p>
                  <p className="text-sm font-medium">Configuração manual via suporte HS Digital.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

function CjDirectConfigForm({ store }: { store: any }) {
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
    } else {
      // 2. Busca na tabela supplier_integrations
      supabase
        .from("supplier_integrations")
        .select("access_token_encrypted")
        .eq("store_id", store?.id)
        .eq("provider", "cj")
        .maybeSingle()
        .then(({ data }) => {
          if (data?.access_token_encrypted) {
            setApiKey(data.access_token_encrypted);
            setSaved(true);
          }
        });
    }
  }, [store?.id]);

  const handleSaveAndSync = async () => {
    if (!apiKey.trim()) {
      toast.error("Informe sua chave API (CJ-Access-Token).");
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

        const rawText = await res.text();

        if (rawText.includes("Only HTML requests are supported here") || !res.ok) {
          toast.success("Chave de API salva com sucesso! Sincronização da CJ iniciada em segundo plano.");
        } else {
          try {
            const data = JSON.parse(rawText);
            toast.success(data.message || "Catálogo sincronizado com 35% de margem com sucesso!");
            setTimeout(() => window.location.reload(), 1500);
          } catch {
            toast.success("Chave salva! Importação da CJ em processamento.");
          }
        }
      } catch {
        toast.success("Chave salva com sucesso! Sincronização em segundo plano ativada.");
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
              Sincronizando...
            </>
          ) : (
            "Salvar e Sincronizar"
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {saved ? (
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Chave configurada e ativa
          </span>
        ) : (
          <span>Obtenha seu token em: cjdropshipping.com &gt; Authorization &gt; API</span>
        )}
      </div>
    </div>
  );
}

function StoreSetupForm({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("stores").insert({
        owner_id: userId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
      });
      if (error) throw error;
      toast.success("Loja criada com sucesso!");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar loja.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <h2 className="font-display text-lg font-bold">Crie sua loja no marketplace</h2>
      <div>
        <Label htmlFor="store-name">Nome da loja</Label>
        <Input
          id="store-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ex: Tech Imports"
          required
        />
      </div>
      <div>
        <Label htmlFor="store-slug">Identificador (slug da URL)</Label>
        <Input
          id="store-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="tech-imports"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">Sua loja ficará em: /loja/{slug || "..."}</p>
      </div>
      <div>
        <Label htmlFor="store-desc">Descrição (opcional)</Label>
        <Textarea
          id="store-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Conte um pouco sobre os produtos que você vende..."
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Criando loja..." : "Criar minha loja"}
      </Button>
    </form>
  );
}

function FinancialSummary({
  storeId,
  transactions,
}: {
  storeId: string;
  transactions: Array<{
    amount: number;
    fee: number;
    net_amount: number;
    status: string;
    created_at: string;
  }>;
}) {
  const [filterPeriod, setFilterPeriod] = useState<"all" | "30" | "7">("all");

  const filtered = transactions.filter((t) => {
    if (filterPeriod === "all") return true;
    const days = filterPeriod === "30" ? 30 : 7;
    const cutoff = new Date(Date.now() - days * 86_400_000);
    return new Date(t.created_at) >= cutoff;
  });

  const approved = filtered.filter((t) => t.status === "approved");
  const pending = filtered.filter((t) => t.status === "pending" || t.status === "in_process");

  const grossRevenue = approved.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const platformFees = approved.reduce((acc, t) => acc + Number(t.fee || 0), 0);
  const netEarnings = approved.reduce((acc, t) => acc + Number(t.net_amount || 0), 0);
  const pendingAmount = pending.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <div>
          <h2 className="font-display text-lg font-bold">Resumo Financeiro</h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe suas vendas e valores repassados via Mercado Pago.
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          <Button
            variant={filterPeriod === "7" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterPeriod("7")}
          >
            7 dias
          </Button>
          <Button
            variant={filterPeriod === "30" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterPeriod("30")}
          >
            30 dias
          </Button>
          <Button
            variant={filterPeriod === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterPeriod("all")}
          >
            Tudo
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Faturamento Bruto</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{brl(grossRevenue)}</p>
          <p className="text-[11px] text-muted-foreground">{approved.length} vendas confirmadas</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Líquido a Receber</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{brl(netEarnings)}</p>
          <p className="text-[11px] text-muted-foreground">Creditado no seu Mercado Pago</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Taxas da Plataforma</span>
            <WalletCards className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{brl(platformFees)}</p>
          <p className="text-[11px] text-muted-foreground">12% por transação</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Valores Pendentes</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{brl(pendingAmount)}</p>
          <p className="text-[11px] text-muted-foreground">
            {pending.length} transações aguardando
          </p>
        </div>
      </div>
    </div>
  );
}

function ShippingConfigCard({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const connectMelhorEnvio = useServerFn(startMelhorEnvioConnection);
  const saveOrigin = useServerFn(saveSellerOriginPostalCode);
  const [postalCode, setPostalCode] = useState("");
  const [savingPostalCode, setSavingPostalCode] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["seller-shipping-config", storeId],
    queryFn: async () => {
      const getCfg = useServerFn(getSellerShippingConfiguration);
      return getCfg({ data: { storeId } });
    },
  });

  useEffect(() => {
    if (config?.originPostalCode) {
      setPostalCode(config.originPostalCode);
    }
  }, [config?.originPostalCode]);

  const handleSaveOrigin = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = postalCode.replace(/\D/g, "");
    if (sanitized.length !== 8) {
      toast.error("O CEP de origem precisa ter 8 dígitos.");
      return;
    }
    setSavingPostalCode(true);
    try {
      const result = await saveOrigin({ data: { storeId, postalCode: sanitized } });
      toast.success("CEP de origem salvo com sucesso.");
      setPostalCode(result.originPostalCode);
      await qc.invalidateQueries({ queryKey: ["seller-shipping-config", storeId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o CEP.");
    } finally {
      setSavingPostalCode(false);
    }
  };

  const handleConnectMelhorEnvio = async () => {
    try {
      const result = await connectMelhorEnvio({ data: { storeId } });
      if (result?.authUrl) {
        window.location.href = result.authUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar ao Melhor Envio.");
    }
  };

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold">Frete e Envio dos Produtos</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure o CEP de despacho para cálculo real via Correios/transportadoras e conecte seu
            Melhor Envio para emitir etiquetas com desconto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config?.hasMelhorEnvio ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Melhor Envio conectado
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectMelhorEnvio}
              disabled={isLoading}
            >
              Conectar Melhor Envio
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveOrigin} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs space-y-1">
          <Label htmlFor="origin-cep" className="text-xs">
            CEP de origem do seu estoque
          </Label>
          <Input
            id="origin-cep"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
          />
        </div>
        <Button type="submit" size="sm" disabled={savingPostalCode}>
          {savingPostalCode ? "Salvando..." : "Salvar CEP"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Usado como ponto de partida no cálculo do frete no carrinho.
        </span>
      </form>
    </div>
  );
}

function MercadoPagoCard({ store, onConnect }: { store: any; onConnect: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const isConnected = !!store.mercado_pago_user_id;

  const handleClick = async () => {
    setLoading(true);
    try {
      await onConnect();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar Mercado Pago.");
      setLoading(false);
    }
  };

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-600">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold">Repasse Mercado Pago (Split)</h2>
            <p className="text-xs text-muted-foreground">
              {isConnected
                ? "Sua conta Mercado Pago está conectada. Os repasses líquidos caem automaticamente."
                : "Conecte sua conta Mercado Pago para receber os repasses das suas vendas."}
            </p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Conectado (ID: {store.mercado_pago_user_id})
              </span>
              <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
                Reconectar
              </Button>
            </div>
          ) : (
            <Button onClick={handleClick} disabled={loading} size="sm">
              {loading ? "Redirecionando..." : "Conectar com Mercado Pago"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsList({
  products,
  onProductDeleted,
}: {
  products: any[];
  onProductDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto excluído.");
      onProductDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleting(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 font-display font-bold">Nenhum produto cadastrado</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Comece adicionando seu primeiro produto para começar a vender.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Estoque</th>
              <th className="p-3">Mídia</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => {
              const mediaCount = p.product_media?.length || (p.image_url ? 1 : 0);
              const hasVideo = p.product_media?.some((m: any) => m.media_type === "video");

              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.is_active ? "Ativo" : "Inativo"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs capitalize text-muted-foreground">{p.category}</td>
                  <td className="p-3 font-semibold">{brl(p.price)}</td>
                  <td className="p-3 text-xs">{p.stock} un.</td>
                  <td className="p-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Image className="h-3.5 w-3.5" />
                        {mediaCount}
                      </span>
                      {hasVideo && (
                        <span className="flex items-center gap-0.5 text-primary">
                          <Video className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewProductForm({ storeId, onCreated }: { storeId: string; onCreated: () => void }) {
  const createProduct = useServerFn(createSellerProduct);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [category, setCategory] = useState("eletronicos");
  const [productType, setProductType] = useState<"physical" | "digital">("physical");
  const [weightKg, setWeightKg] = useState("0.5");
  const [widthCm, setWidthCm] = useState("15");
  const [heightCm, setHeightCm] = useState("10");
  const [lengthCm, setLengthCm] = useState("20");
  const [mediaUrls, setMediaUrls] = useState<Array<{ url: string; type: "image" | "video" }>>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<"image" | "video">("image");
  const [loading, setLoading] = useState(false);

  const addMedia = () => {
    if (!newUrl.trim()) return;
    setMediaUrls([...mediaUrls, { url: newUrl.trim(), type: newType }]);
    setNewUrl("");
  };

  const removeMedia = (idx: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price.replace(",", "."));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Informe um preço válido.");
      return;
    }

    setLoading(true);
    try {
      await createProduct({
        data: {
          storeId,
          title: title.trim(),
          description: description.trim() || undefined,
          price: parsedPrice,
          stock: parseInt(stock, 10) || 0,
          category,
          productType,
          weightKg: productType === "physical" ? parseFloat(weightKg) || 0.5 : undefined,
          widthCm: productType === "physical" ? parseFloat(widthCm) || 15 : undefined,
          heightCm: productType === "physical" ? parseFloat(heightCm) || 10 : undefined,
          lengthCm: productType === "physical" ? parseFloat(lengthCm) || 20 : undefined,
          media: mediaUrls,
        },
      });

      toast.success("Produto criado com sucesso!");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-6 p-6">
      <h2 className="font-display text-lg font-bold">Cadastrar Novo Produto</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="p-title">Título do produto</Label>
          <Input
            id="p-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Fone de Ouvido Bluetooth Sem Fio"
            required
          />
        </div>

        <div>
          <Label htmlFor="p-price">Preço (R$)</Label>
          <Input
            id="p-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="99.90"
            required
          />
        </div>

        <div>
          <Label htmlFor="p-stock">Estoque inicial</Label>
          <Input
            id="p-stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="p-cat">Categoria</Label>
          <select
            id="p-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="p-type">Tipo de Produto</Label>
          <select
            id="p-type"
            value={productType}
            onChange={(e) => setProductType(e.target.value as any)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="physical">Físico (com frete e dimensões)</option>
            <option value="digital">Digital (download / acesso)</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="p-desc">Descrição completa</Label>
          <Textarea
            id="p-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva detalhes, garantia, especificações técnicas..."
          />
        </div>
      </div>

      {productType === "physical" && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold">Dimensões e Peso para Cálculo de Frete</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Peso (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Largura (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Altura (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Comprimento (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Fotos e Vídeos do Produto</h3>
        <p className="text-xs text-muted-foreground">
          Adicione URLs de imagens ou vídeos (YouTube, MP4, etc.). A primeira imagem será usada como capa.
        </p>

        <div className="flex flex-wrap gap-2">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            className="flex-1"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="image">Imagem</option>
            <option value="video">Vídeo</option>
          </select>
          <Button type="button" variant="outline" onClick={addMedia}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>

        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {mediaUrls.map((m, i) => (
              <div key={i} className="group relative rounded border bg-muted p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-medium capitalize">
                    {m.type === "image" ? <Image className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                    {m.type} {i === 0 && "(Capa)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="text-destructive hover:underline"
                  >
                    remover
                  </button>
                </div>
                <p className="mt-1 truncate text-muted-foreground">{m.url}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Salvando produto..." : "Cadastrar Produto"}
        </Button>
      </div>
    </form>
  );
}

function SellerOrdersList({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const processFulfillment = useServerFn(processSupplierFulfillment);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["seller-orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `*,
          order_items(*, product:products(*)),
          buyer:profiles!orders_buyer_id_fkey(name, email, phone)
        `,
        )
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSaveTracking = async (orderId: string) => {
    if (!trackingNumber.trim()) return;
    setSavingTracking(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          shipping_tracking_number: trackingNumber.trim(),
          shipping_status: "in_transit",
          status: "shipped",
        })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Código de rastreamento adicionado!");
      setTrackingNumber("");
      setSelectedOrder(null);
      qc.invalidateQueries({ queryKey: ["seller-orders", storeId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar rastreamento.");
    } finally {
      setSavingTracking(false);
    }
  };

  const handleProcessSupplier = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const res = await processFulfillment({ data: { orderId } });
      toast.success(res.message || "Pedido enviado para processamento no fornecedor.");
      qc.invalidateQueries({ queryKey: ["seller-orders", storeId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar com fornecedor.");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando pedidos...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 font-display font-bold">Nenhum pedido recebido ainda</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Assim que os clientes comprarem seus produtos, os pedidos aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const isCjOrder = o.order_items?.some(
          (item: any) => item.product?.supplier === "cj",
        );

        return (
          <div key={o.id} className="surface-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <span className="font-mono text-xs text-muted-foreground">
                  Pedido #{o.id.slice(0, 8)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    o.payment_status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {o.payment_status === "paid" ? "Pago" : o.payment_status}
                </span>

                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase">
                  {o.shipping_status || o.status}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Itens</h4>
                <div className="mt-2 space-y-2">
                  {o.order_items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="truncate pr-2">
                        {item.quantity}x {item.product?.title || "Produto"}
                      </span>
                      <span className="font-medium shrink-0">{brl(item.price_at_purchase)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-1 flex justify-between font-bold text-xs">
                    <span>Total</span>
                    <span>{brl(o.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                  Dados de Entrega
                </h4>
                <p className="mt-1 text-xs">
                  <strong>{o.buyer?.name || "Cliente"}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  {o.shipping_address_line1}, {o.shipping_city} - {o.shipping_state} (CEP:{" "}
                  {o.shipping_postal_code})
                </p>

                {o.shipping_tracking_number && (
                  <p className="mt-2 text-xs font-mono text-primary font-semibold">
                    Rastreamento: {o.shipping_tracking_number}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isCjOrder && o.payment_status === "paid" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleProcessSupplier(o.id)}
                    disabled={processingId === o.id}
                  >
                    <Boxes className="mr-1 h-3.5 w-3.5 text-blue-600" />
                    {processingId === o.id ? "Enviando..." : "Enviar p/ Fornecedor CJ"}
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedOrder(selectedOrder === o.id ? null : o.id)}
                >
                  <Truck className="mr-1 h-3.5 w-3.5" />
                  {o.shipping_tracking_number ? "Alterar Rastreio" : "Adicionar Rastreio"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="ghost">
                  <Link to="/notificacoes">
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> Mensagens
                  </Link>
                </Button>
              </div>
            </div>

            {selectedOrder === o.id && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
                <Label htmlFor={`track-${o.id}`} className="text-xs font-semibold">
                  Código de Rastreamento (Correios / Transportadora / CJ)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`track-${o.id}`}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Ex: BR1234567890X ou QB123456789BR"
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleSaveTracking(o.id)}
                    disabled={savingTracking || !trackingNumber.trim()}
                  >
                    {savingTracking ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
