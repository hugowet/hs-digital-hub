// @ts-nocheck -- types out of sync with backend schema; see build log
import { deliveryFields, deliveryReport, deliverySteps, showsManualPurchaseReport } from "@/lib/order-delivery";
import { AmazonAffiliateImporter } from "@/components/admin/AmazonAffiliateImporter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getSellerShippingConfiguration,
  saveSellerOriginPostalCode,
  startMelhorEnvioConnection,
  saveOrderTracking,
  getSellerOrderPhotos,
} from "@/lib/shipping.functions";

 import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  Pencil,
  TrendingUp,
  Truck,
  Video,
  WalletCards,
  XCircle,
  RefreshCw,
  Boxes,
  Upload,
  X,
  Star,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { isOrderVisibleToSeller } from "@/lib/order-visibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellerMessagesTab } from "@/components/seller-messages-tab";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { CATEGORIES } from "@/lib/catalog";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { startMercadoPagoConnection } from "@/lib/payments.functions";
import { processSupplierFulfillment, syncCjProducts, getCjSupplierStatus, updateCjContent, setCjAutoImport } from "@/lib/suppliers.functions";

export const Route = createFileRoute("/_authenticated/vendedor")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Seller Center · HS Digital" },
      {
        name: "description",
        content: "Gerencie sua loja, produtos, vendas e pedidos na HS Digital.",
      },
      { property: "og:title", content: "Seller Center · HS Digital" },
      { property: "og:description", content: "Gerencie produtos, fornecedores e pedidos da sua loja HS Digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const syncCj = useServerFn(syncCjProducts);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const cjBatchRunning = useRef(false);

  // Estado para Edição de Produto
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCompareAt, setEditCompareAt] = useState("");
  const [editSupplierCost, setEditSupplierCost] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [activeTab, setActiveTab] = useState("products");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  // Importadores (CJ Dropshipping e Amazon) são exclusivos da conta da plataforma.
  const isPlatformOwner = userEmail === "hugohug12ou@gmail.com";

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

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setEditTitle(p.title || "");
    setEditPrice(String(p.price || ""));
    setEditCompareAt(p.compare_at_price ? String(p.compare_at_price) : "");
    setEditSupplierCost(p.supplier_cost ? String(p.supplier_cost) : "");
    setEditStock(String(p.stock ?? ""));
    setEditImageUrl(p.image_url || "");
    setEditDescription(p.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setSavingEdit(true);
    try {
      const parsedPrice = parseFloat(editPrice.replace(",", "."));
      const parsedStock = parseInt(editStock, 10);
      const parsedCompareAt = editCompareAt ? parseFloat(editCompareAt.replace(",", ".")) : null;

      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        toast.error("Preço inválido.");
        return;
      }

      const { error } = await supabase
        .from("products")
        .update({
          title: editTitle.trim(),
          price: parsedPrice,
          compare_at_price: parsedCompareAt,
          stock: isNaN(parsedStock) ? 0 : parsedStock,
          image_url: editImageUrl.trim() || null,
          description: editDescription.trim() || null,
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      toast.success("Produto atualizado com sucesso!");
      setEditingProduct(null);
      qc.invalidateQueries({ queryKey: ["store-products"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alterações.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (storeLoading) {
    return (
      <Shell>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Shell>
    );
  }

  if (!store) {
    return (
      <Shell>
        <SellerRequestForm
          userId={userId}
          onCreated={() => qc.invalidateQueries({ queryKey: ["seller-store", userId] })}
        />
      </Shell>
    );
  }

  if (store.status === "pending") {
    return (
      <Shell>
        <div className="mx-auto max-w-md py-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-xl font-bold">Loja criada! Aguardando análise do time HS Digital</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua loja <strong>{store.name}</strong> foi criada e está aguardando análise do time HS Digital.
            Assim que for aprovada, você poderá conectar seu Mercado Pago e começar a cadastrar produtos.
          </p>
        </div>
      </Shell>
    );
  }

  if (store.status === "rejected") {
    return (
      <Shell>
        <div className="mx-auto max-w-md py-12 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-xl font-bold">Solicitação não aprovada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A solicitação da loja <strong>{store.name}</strong> não foi aprovada desta vez. Fale com o suporte da HS
            Digital para mais detalhes.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
          <p className="text-sm text-muted-foreground">Painel de controle do vendedor</p>
        </div>
        <Button variant="bank" asChild><Link to="/hs-bank"><WalletCards className="size-4" />HS Bank</Link></Button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-success/10 px-4 py-2.5 text-sm font-semibold text-success">
        <BadgeCheck className="h-4 w-4 shrink-0" />
        Loja aprovada! Você já pode conectar seu Mercado Pago e cadastrar produtos.
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto border-b">
          <TabsTrigger value="orders">Pedidos e Envios</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="products">Meus produtos</TabsTrigger>
          <TabsTrigger value="create">Cadastrar produto</TabsTrigger>
          <TabsTrigger value="sales">Vendas e extrato</TabsTrigger>
          <TabsTrigger value="mercadopago">Mercado Pago</TabsTrigger>
          {isPlatformOwner && <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>}
          {isPlatformOwner && <TabsTrigger value="amazon-affiliate">Importador Amazon</TabsTrigger>}
        </TabsList>

        {/* Aba de Pedidos e Rastreio */}
        <TabsContent value="orders" className="pt-4">
          <SellerOrdersTab storeId={store.id} showManualReport={showsManualPurchaseReport(userEmail)} />
        </TabsContent>

        {/* Aba de Mensagens dos compradores */}
        <TabsContent value="messages" className="pt-4">
          <SellerMessagesTab />
        </TabsContent>

        {/* Aba de Produtos */}
        <TabsContent value="products" className="pt-4">
          <section className="surface-card p-4">
            <h2 className="text-base font-semibold mb-4">Meus produtos ({products.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="border border-border p-3 rounded-lg flex justify-between items-center bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {brl(p.price)} · Estoque: {p.stock ?? 0}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs font-semibold"
                    onClick={() => handleOpenEdit(p)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
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
          {!store.contract_accepted_at ? (
            <SellerContract
              storeId={store.id}
              onAccepted={() => qc.invalidateQueries({ queryKey: ["seller-store", userId] })}
            />
          ) : (
            <div className="max-w-xl">
              <div className="mb-4 rounded-md border border-border bg-muted/40 p-4">
                <h2 className="font-semibold">Venda com estoque próprio</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre seus produtos com até 10 fotos da galeria, defina preço, estoque e categoria.
                </p>
              </div>
              <ProductForm
                storeId={store.id}
                onCreated={() => {
                  qc.invalidateQueries({ queryKey: ["store-products"] });
                  setActiveTab("products");
                }}
              />
            </div>
          )}
        </TabsContent>

        {/* Aba de Vendas e Extrato */}
        <TabsContent value="sales" className="pt-4">
          <SellerSalesManager storeId={store.id} transactions={transactions} />
        </TabsContent>

        {/* Aba Mercado Pago da Loja */}
        <TabsContent value="mercadopago" className="pt-4">
          <SellerMercadoPagoTab storeId={store.id} currentStatus={store.mercado_pago_status} />
        </TabsContent>

        {/* Aba de Fornecedores */}
        <TabsContent value="suppliers" className="pt-4">
          {isPlatformOwner ? <CjSupplierPanel storeId={store.id} /> : null}
        </TabsContent>

         {/* Aba Importador Amazon */}
        <TabsContent value="amazon-affiliate" className="pt-4">
          {isPlatformOwner ? <AmazonAffiliateImporter /> : null}
        </TabsContent>
      </Tabs>

      {/* Modal de Edição */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>Altere as informações do seu produto abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Preço de Venda (R$)</Label>
                <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Estoque</Label>
                <Input value={editStock} onChange={(e) => setEditStock(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">URL da Imagem Principal</Label>
              <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function CjSupplierPanel({ storeId }: { storeId: string }) {
  const statusFn = useServerFn(getCjSupplierStatus);
  const contentFn = useServerFn(updateCjContent);
  const syncFn = useServerFn(syncCjProducts);
  const autoFn = useServerFn(setCjAutoImport);
  const toggleAuto = async (enabled: boolean) => {
    setBusy("auto");
    try {
      await autoFn({ data: { storeId, enabled } });
      toast.success(enabled ? "Importação automática retomada." : "Importação automática pausada.");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar a importação.");
    } finally { setBusy(null); }
  };
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["cj-supplier-status", storeId],
    queryFn: () => statusFn({ data: { storeId } }),
    refetchInterval: 15_000,
  });
  const run = async (operation: "titles" | "details" | "catalog") => {
    setBusy(operation);
    try {
      const result = operation === "catalog"
        ? await syncFn({ data: { storeId } })
        : await contentFn({ data: { storeId, operation } });
      if (result.error) toast.error(result.error);
      else if (result.busy) toast.info("Uma atualização já está em andamento.");
      else toast.success(operation === "catalog" ? "Lote do catálogo processado." : `${result.processed} produtos atualizados neste lote.`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a CJ.");
    } finally { setBusy(null); }
  };
  const labels = { pending: "Aguardando próximo lote", running: "Em andamento", paused: "Pausado", completed: "Concluído" };
  return <section className="space-y-5 py-2">
    <h2 className="text-lg font-semibold">CJ Dropshipping</h2>
    {isPending && <p className="text-sm text-muted-foreground">Carregando totais...</p>}
    {error && <p role="alert" className="text-sm text-destructive">Não foi possível consultar os produtos da CJ.</p>}
    {data && <>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-5 lg:grid-cols-4">
        {[["Produtos importados", data.total.toLocaleString("pt-BR")], ["Ativos na vitrine", data.active.toLocaleString("pt-BR")], ["Títulos em português", `${data.translated.toLocaleString("pt-BR")} / ${data.total.toLocaleString("pt-BR")}`], ["Fichas consultadas na CJ", `${data.details.toLocaleString("pt-BR")} / ${data.total.toLocaleString("pt-BR")}`]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold break-words">{value}</dd></div>)}
      </dl>
      {data.catalog && <p className="text-sm text-muted-foreground">Categorias: {data.catalog.completed_categories} de {data.catalog.total_categories} · {labels[data.catalog.status] ?? data.catalog.status}</p>}
      {data.catalog?.pause_reason && <p className="text-sm text-destructive">{data.catalog.pause_reason}</p>}
      <div className="space-y-3">
        {data.jobs.map((job) => <div key={job.operation} className="border-b border-border pb-3">
          <p className="text-sm font-medium">{job.operation === "titles" ? "Tradução dos títulos" : "Descrições e especificações oficiais"} · {labels[job.status] ?? job.status}</p>
          {job.pause_reason && <p role="alert" className="mt-1 break-words text-sm text-destructive">{job.pause_reason}</p>}
        </div>)}
      </div>
    </>}
    <div className="flex flex-wrap gap-3">
      {data && <Button variant={data.autoImport ? "destructive" : "default"} disabled={!!busy} onClick={() => toggleAuto(!data.autoImport)}>
        {busy === "auto" ? "Salvando..." : data.autoImport ? "Pausar importação automática" : "Retomar importação automática"}
      </Button>}
      <Button variant="outline" disabled={!!busy} onClick={() => run("catalog")}><RefreshCw className="h-4 w-4" />{busy === "catalog" ? "Sincronizando..." : "Sincronizar catálogo CJ"}</Button>
      <Button variant="outline" disabled={!!busy} onClick={() => run("titles")}><RefreshCw className="h-4 w-4" />{busy === "titles" ? "Traduzindo..." : "Traduzir títulos"}</Button>
      <Button variant="outline" disabled={!!busy} onClick={() => run("details")}><Package className="h-4 w-4" />{busy === "details" ? "Consultando CJ..." : "Atualizar fichas técnicas"}</Button>
    </div>
  </section>;
}

function SellerMercadoPagoTab({
  storeId,
  currentStatus,
}: {
  storeId: string;
  currentStatus: string | null;
}) {
  const [connecting, setConnecting] = useState(false);
  const connectServerFn = useServerFn(startMercadoPagoConnection);
  const isConnected = currentStatus === "connected";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const origin = window.location.origin;
      const res = await connectServerFn({ data: { storeId, origin } });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error("Não foi possível gerar o link de autorização.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar com Mercado Pago.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="surface-card space-y-4 p-5 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Conexão Mercado Pago</h2>
        <p className="text-sm text-muted-foreground">
          Conecte sua conta do Mercado Pago para receber pagamentos de vendas diretamente em sua carteira.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status da Conexão:</span>
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Conta Conectada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500">
              <AlertCircle className="h-4 w-4" />
              Não Conectada
            </span>
          )}
        </div>

        {!isConnected && (
          <p className="mt-3 text-xs text-muted-foreground">
            Atenção: Enquanto sua carteira não estiver conectada, compradores não conseguirão finalizar pedidos de itens da sua loja.
          </p>
        )}
      </div>

      <div className="pt-2">
        <Button onClick={handleConnect} disabled={connecting} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          {connecting
            ? "Redirecionando..."
            : isConnected
              ? "Reconectar conta Mercado Pago"
              : "Conectar minha conta Mercado Pago"}
        </Button>
      </div>
    </div>
  );
}

// Formulário de Cadastro com Anexo de Fotos da Galeria (Máximo 10)
function ProductForm({ storeId, onCreated }: { storeId: string; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]?.slug ?? "geral");
  const [description, setDescription] = useState("");

  // Fotos selecionadas da galeria (até 10 fotos)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (newFiles.length === 0) {
      toast.error("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    const totalAllowed = 10 - selectedFiles.length;
    if (totalAllowed <= 0) {
      toast.error("Você já atingiu o limite máximo de 10 fotos.");
      return;
    }

    const filesToAdd = newFiles.slice(0, totalAllowed);
    if (newFiles.length > totalAllowed) {
      toast.info(`Limite de 10 fotos atingido. Foram adicionadas apenas ${totalAllowed} fotos.`);
    }

    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));

    setSelectedFiles((prev) => [...prev, ...filesToAdd]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);

    // Reseta o input para permitir selecionar mais fotos se quiser
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    setSelectedFiles((prev) => {
      const copy = [...prev];
      const item = copy.splice(index, 1)[0];
      copy.unshift(item);
      return copy;
    });
    setFilePreviews((prev) => {
      const copy = [...prev];
      const item = copy.splice(index, 1)[0];
      copy.unshift(item);
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error("Anexe pelo menos 1 foto do produto.");
      return;
    }

    setLoading(true);
    try {
      const parsedPrice = parseFloat(price.replace(",", "."));
      const parsedCostPrice = costPrice ? parseFloat(costPrice.replace(",", ".")) : null;
      const parsedStock = parseInt(stock, 10);

      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        toast.error("Preço de venda inválido.");
        setLoading(false);
        return;
      }

      // 1. Upload de cada foto para o Supabase Storage bucket 'product-images'
      const uploadedUrls: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${storeId}/${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, file, { cacheControl: "3600", upsert: true });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(path);
          uploadedUrls.push(publicData.publicUrl);
        } else {
          // Se o bucket não estiver público ou der erro, cria uma data URL comprimida como fallback
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(String(ev.target?.result));
            reader.readAsDataURL(file);
          });
          uploadedUrls.push(dataUrl);
        }
      }

      // 2. Insere diretamente na tabela products
      const { error: insertError } = await supabase.from("products").insert({
        store_id: storeId,
        title: title.trim(),
        price: parsedPrice,
        compare_at_price: parsedCostPrice,
        stock: isNaN(parsedStock) ? 0 : parsedStock,
        category,
        description: description.trim() || null,
        image_url: uploadedUrls[0] || null,
        gallery_urls: uploadedUrls,
        is_active: true,
      });

      if (insertError) throw insertError;

      toast.success("Produto cadastrado com sucesso com as fotos anexadas!");
      setTitle("");
      setPrice("");
      setCostPrice("");
      setStock("");
      setDescription("");
      setSelectedFiles([]);
      setFilePreviews([]);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-4 p-5">
      <div className="space-y-1.5">
        <Label htmlFor="form-title">Título do produto</Label>
        <Input
          id="form-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Tênis Esportivo Casual"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="form-price">Preço de venda (R$)</Label>
          <Input
            id="form-price"
            required
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="form-cost">Preço de custo (R$)</Label>
          <Input
            id="form-cost"
            type="number"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="form-stock">Estoque inicial</Label>
          <Input
            id="form-stock"
            required
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="form-cat">Categoria</Label>
          <select
            id="form-cat"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="form-desc">Descrição</Label>
        <Textarea
          id="form-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes, medidas, composição..."
        />
      </div>

      {/* Seção de Anexo de Fotos da Galeria (Limite 10) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <Label className="font-semibold text-sm">
            Fotos do Produto ({selectedFiles.length}/10)
          </Label>
          <span className="text-xs text-muted-foreground">A 1ª foto será a capa principal</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="product-gallery-input"
        />

        {/* Grade de fotos anexadas */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-1">
          {filePreviews.map((preview, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted group shadow-sm"
            >
              <img src={preview} alt="" className="h-full w-full object-cover" />
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                  Capa
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {idx !== 0 && (
                  <button
                    type="button"
                    title="Definir como capa"
                    onClick={() => makeCover(idx)}
                    className="h-7 w-7 rounded-full bg-white/90 text-primary flex items-center justify-center hover:bg-white"
                  >
                    <Star className="h-3.5 w-3.5 fill-primary" />
                  </button>
                )}
                <button
                  type="button"
                  title="Remover foto"
                  onClick={() => removePhoto(idx)}
                  className="h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Botão de abrir galeria */}
          {selectedFiles.length < 10 && (
            <label
              htmlFor="product-gallery-input"
              className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/80 bg-muted/20 text-muted-foreground hover:text-foreground transition p-2 text-center"
            >
              <Upload className="h-6 w-6 mb-1 text-primary" />
              <span className="text-xs font-semibold">Abrir Galeria</span>
              <span className="text-[10px] text-muted-foreground">Máx. 10 fotos</span>
            </label>
          )}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full mt-4">
        {loading ? "Cadastrando produto..." : "Publicar produto"}
      </Button>
    </form>
  );
}

function SellerContract({ storeId, onAccepted }: { storeId: string; onAccepted: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    if (!agreed || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ contract_accepted_at: new Date().toISOString() })
        .eq("id", storeId);
      if (error) throw error;
      toast.success("Contrato aceito! Agora você pode cadastrar seus produtos.");
      onAccepted();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível registrar o aceite.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold">Contrato de Vendedor HS Digital</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Leia com atenção antes de cadastrar seu primeiro produto.
      </p>
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">
        <p><strong>1. Retenção do repasse (proteção contra golpe).</strong> O valor de cada venda fica retido pela plataforma e só é liberado para o vendedor quando o pedido for confirmado como <strong>entregue na casa do cliente</strong>. Pedidos cancelados, devolvidos ou com fraude comprovada não geram repasse.</p>
        <p><strong>2. Veracidade dos anúncios.</strong> O vendedor é responsável por fotos, descrições, preços e estoque reais. Anúncios enganosos, produtos falsificados, proibidos ou sem estoque podem ser removidos e a loja suspensa.</p>
        <p><strong>3. Prazo e envio.</strong> O vendedor deve despachar dentro do prazo informado e registrar o código de rastreio válido. Atrasos recorrentes ou rastreios inválidos podem bloquear novas vendas.</p>
        <p><strong>4. Pagamentos.</strong> Todas as vendas são processadas pelo Mercado Pago conectado à loja, com a comissão da plataforma descontada automaticamente no momento do pagamento. É proibido tentar receber por fora da plataforma.</p>
        <p><strong>5. Atendimento.</strong> O vendedor deve responder às mensagens dos compradores na aba Mensagens e resolver problemas de entrega, troca e devolução de boa-fé.</p>
        <p><strong>6. Cancelamentos e reembolsos.</strong> Se o produto não chegar, chegar com defeito ou for diferente do anunciado, o comprador será reembolsado e o valor não será repassado ao vendedor.</p>
        <p><strong>7. Suspensão.</strong> O descumprimento destas regras pode resultar em retenção de valores, suspensão ou remoção definitiva da loja, conforme análise do time HS Digital.</p>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        Li e concordo com o Contrato de Vendedor HS Digital, incluindo a retenção do dinheiro até a entrega do produto na casa do cliente.
      </label>
      <Button className="mt-4 w-full" disabled={!agreed || saving} onClick={() => void handleAccept()}>
        {saving ? "Registrando..." : "Confirmar e começar a vender"}
      </Button>
    </div>
  );
}

function SellerRequestForm({ userId, onCreated }: { userId: string | null; onCreated: () => void }) {
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const name = storeName.trim();
    if (name.length < 2) {
      toast.error("Informe o nome da sua loja.");
      return;
    }
    setSubmitting(true);
    try {
      const slug = `${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
      const { error } = await supabase.from("stores").insert({
        owner_id: userId,
        name,
        slug,
        description: storeDescription.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Loja criada! Aguardando análise do time HS Digital.");
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-xl font-bold">Venda na HS Digital</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você não precisa de outra conta: com o mesmo e-mail você compra e vende. Envie sua solicitação e, após a
          aprovação do administrador, seu painel de vendedor é liberado.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="surface-card mt-6 space-y-4 p-6">
        <div>
          <Label htmlFor="store-name">Nome da loja</Label>
          <Input
            id="store-name"
            required
            minLength={2}
            maxLength={80}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="mt-1"
            placeholder="Ex.: Loja do Hugo"
          />
        </div>
        <div>
          <Label htmlFor="store-description">O que você vai vender? (opcional)</Label>
          <Textarea
            id="store-description"
            maxLength={300}
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
            className="mt-1"
            placeholder="Ex.: eletrônicos, acessórios, produtos digitais..."
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Enviando..." : "Solicitar aprovação para vender"}
        </Button>
      </form>
    </div>
  );
}

const DELIVERY_STEPS = deliverySteps;

function SellerOrdersTab({ storeId, showManualReport = false }: { storeId: string; showManualReport?: boolean }) {
  const qc = useQueryClient();
  const saveTracking = useServerFn(saveOrderTracking);
  const loadPhotos = useServerFn(getSellerOrderPhotos);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [savingTracking, setSavingTracking] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { code: string; carrier: string }>>({});

  const { data: rawOrders = [], isLoading, error: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ["store-orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          payment_status,
          payout_status,
          total,
          shipping_address,
          created_at,
          order_items!inner(store_id,product_id,title,quantity,unit_price,seller_amount)
        `)
        .eq("order_items.store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = rawOrders.filter((o: any) => isOrderVisibleToSeller(o));

  const productIds = [...new Set(orders.flatMap((o: any) => o.order_items.map((i: any) => i.product_id).filter(Boolean)))] as string[];
  const { data: photos = [] } = useQuery({
    queryKey: ["seller-order-photos", storeId, productIds.join(",")],
    enabled: showManualReport && productIds.length > 0,
    queryFn: () => loadPhotos({ data: { storeId, productIds: productIds.slice(0, 500) } }),
    staleTime: 30 * 60_000,
  });
  // Busca eventos de rastreio existentes
  const { data: trackingEvents = [] } = useQuery({
    enabled: orders.length > 0,
    queryKey: ["store-orders-tracking", storeId, orders.map((o: any) => o.id).join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_tracking_events")
        .select("order_id,status,created_at,note")
        .in("order_id", orders.map((o: any) => o.id))
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Busca códigos de rastreio salvos
  const { data: fulfillments = [] } = useQuery({
    enabled: orders.length > 0,
    queryKey: ["store-orders-fulfillments", storeId, orders.map((o: any) => o.id).join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_fulfillments")
        .select("order_id,tracking_code,tracking_carrier,status")
        .eq("store_id", storeId)
        .in("order_id", orders.map((o: any) => o.id));
      if (error) throw error;
      return data ?? [];
    },
  });

  const currentStep = (orderId: string) => {
    const evt = trackingEvents.find((e: any) => e.order_id === orderId);
    return evt?.status ?? "confirmed";
  };

  const getFulfillment = (orderId: string) => {
    return fulfillments.find((f: any) => f.order_id === orderId);
  };

  const handleStepChange = async (orderId: string, step: string) => {
    setUpdatingOrder(orderId);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const label = DELIVERY_STEPS.find(([value]) => value === step)?.[1] ?? step;
      const { error } = await supabase.from("order_tracking_events").insert({
        order_id: orderId,
        status: step,
        note: `Status atualizado pelo vendedor: ${label}`,
        created_by: userData.user?.id,
      });
      if (error) throw error;
      toast.success(
        step === "delivered"
          ? "Pedido entregue! O repasse foi liberado."
          : "Etapa de entrega atualizada.",
      );
      await qc.invalidateQueries({ queryKey: ["store-orders-tracking", storeId] });
      await qc.invalidateQueries({ queryKey: ["store-orders", storeId] });
      await qc.invalidateQueries({ queryKey: ["store-payouts", storeId] });
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível atualizar o status.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleSaveTracking = async (orderId: string) => {
    const input = trackingInputs[orderId];
    if (!input?.code?.trim()) {
      toast.error("Informe o código de rastreio.");
      return;
    }
    setSavingTracking(orderId);
    try {
      await saveTracking({
        data: {
          orderId,
          storeId,
          trackingCode: input.code.trim(),
          trackingCarrier: input.carrier?.trim() || "Transportadora",
        },
      });
      toast.success("Código de rastreio enviado com sucesso! O cliente já pode acompanhar.");
      await qc.invalidateQueries({ queryKey: ["store-orders-fulfillments", storeId] });
      await qc.invalidateQueries({ queryKey: ["store-orders-tracking", storeId] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar código de rastreio.");
    } finally {
      setSavingTracking(null);
    }
  };

  const copyAddressToClipboard = async (order: any) => {
    try {
      const fields = deliveryFields(order.shipping_address || {});
      const text = showManualReport
        ? deliveryReport({ ...order, order_items: order.order_items.filter((i: any) => i.store_id === storeId) })
        : [`Nome: ${fields.name}`, `Telefone: ${fields.phone}`, `Endereço: ${fields.street}`, `Cidade: ${fields.city} / ${fields.state}`, `CEP: ${fields.zip}`].join("\n");
      await navigator.clipboard.writeText(text);
      toast.success(showManualReport ? "Relatório de entrega copiado!" : "Dados de envio copiados!");
    } catch { toast.error("Não foi possível copiar. Tente novamente."); }
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (ordersError) {
    return <div role="alert" className="space-y-3 border border-destructive/30 p-4 rounded-lg">
      <p className="text-sm text-destructive">Não foi possível carregar os pedidos.</p>
      <Button variant="outline" onClick={() => refetchOrders()}><RefreshCw className="size-4" />Tentar novamente</Button>
    </div>;
  }

  if (orders.length === 0) {
    return (
      <div className="surface-card p-5 text-sm text-muted-foreground">
        Nenhum pedido recente registrado.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {orders.map((order: any) => {
        const step = currentStep(order.id);
        const fulfillment = getFulfillment(order.id);
        const storeItems = order.order_items.filter((i: any) => i.store_id === storeId);
        const storeTotal = storeItems.reduce((s: number, i: any) => s + Number(i.seller_amount), 0);
        const addr = order.shipping_address || {};
        const fields = deliveryFields(addr);
        const isPaid = ["paid", "approved"].includes(order.payment_status);
        const currentTracking = trackingInputs[order.id] || {
          code: fulfillment?.tracking_code || "",
          carrier: fulfillment?.tracking_carrier || "Transportadora",
        };

        const cleanPhone = (addr.phone || "").replace(/\D/g, "");

        return (
          <div key={order.id} className="surface-card p-5 space-y-4 rounded-lg border border-border shadow-xs">
            {/* Cabeçalho do Pedido */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">Pedido #{order.id.slice(0, 8).toUpperCase()}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(order.id);
                      toast.success("ID completo do pedido copiado!");
                    }}
                    title="Copiar ID"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    copiar
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{new Date(order.created_at).toLocaleString("pt-BR")}</span>
                  <span>•</span>
                  {isPaid ? (
                    <span className="font-semibold text-success bg-success/10 px-2 py-0.5 rounded">
                      Pagamento Aprovado
                    </span>
                  ) : (
                    <span className="font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Aguardando Pagamento
                    </span>
                  )}
                  <span>•</span>
                  {order.payout_status === "released" ? (
                    <span className="font-medium text-success">Repasse liberado</span>
                  ) : (
                    <span className="font-medium text-muted-foreground">Repasse retido até a entrega</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Seu repasse líquido</span>
                <span className="text-xl font-bold text-foreground">{brl(storeTotal)}</span>
              </div>
            </div>

            {/* Itens Comprados */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Produtos do Pedido ({storeItems.length})
              </p>
              <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg border border-border/50">
                {storeItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-center text-sm">
                    {showManualReport && (photos.find((p: any) => p.id === item.product_id)?.image_url ? <img src={photos.find((p: any) => p.id === item.product_id)?.image_url ?? ""} alt={item.title} loading="lazy" className="h-16 w-16 shrink-0 object-contain rounded-md bg-background" /> : <ImageIcon className="h-12 w-12 shrink-0 text-muted-foreground" />)}
                    <span className="font-medium flex-1 min-w-0 break-words">
                      {item.quantity}x {item.title}
                    </span>
                    <span className="text-muted-foreground">{brl(Number(item.unit_price))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dados do Comprador e Entrega (para você comprar na Amazon) */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {showManualReport ? "Relatório para compra manual · Amazon" : "Dados do Comprador e Endereço de Entrega"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyAddressToClipboard(order)}
                  className="h-7 text-xs gap-1"
                >
                  {showManualReport ? "Copiar relatório completo" : "Copiar dados de envio"}
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {showManualReport && <>
                  <div><span className="text-xs text-muted-foreground block">CPF:</span><span className="font-semibold">{fields.cpf}</span></div>
                  <div><span className="text-xs text-muted-foreground block">Número da casa:</span><span>{fields.number}</span></div>
                  <div><span className="text-xs text-muted-foreground block">Bairro:</span><span>{fields.neighborhood}</span></div>
                </>}

                <div>
                  <span className="text-xs text-muted-foreground block">Nome do Comprador:</span>
                  <span className="font-semibold">{fields.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Celular / Telefone:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{fields.phone}</span>
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/55${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-success hover:underline font-medium"
                      >
                        (WhatsApp)
                      </a>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground block">Endereço completo:</span>
                  <span className="font-medium">
                    {fields.street}
                    {addr.note ? ` • Complemento/Ref: ${addr.note}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Cidade / UF:</span>
                  <span className="font-medium">
                    {addr.city || "Cidade"} {addr.state ? `• ${addr.state}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">CEP:</span>
                  <span className="font-medium font-mono">{addr.postal_code || "Não informado"}</span>
                </div>
              </div>
            </div>

            {showManualReport && <div className="space-y-2">
              <Label htmlFor={`delivery-report-${order.id}`}>Relatório completo de entrega</Label>
              <Textarea
                id={`delivery-report-${order.id}`}
                readOnly
                rows={Math.max(13, storeItems.length + 12)}
                value={deliveryReport({ ...order, order_items: storeItems })}
                className="text-sm leading-6"
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>}

            {/* Controle de Rastreamento e Envio */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Rastreamento & Dinâmica de Entrega
                </p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Etapa:</Label>
                  <select
                    className="rounded-md border border-border bg-background px-2.5 py-1 text-xs"
                    value={step}
                    disabled={updatingOrder === order.id || !isPaid}
                    onChange={(e) => handleStepChange(order.id, e.target.value)}
                  >
                    {DELIVERY_STEPS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Formulário para colar o código de rastreio */}
              <div className="pt-2 border-t border-border/40">
                <span className="text-xs text-muted-foreground block mb-2">
                  Código da transportadora:
                </span>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Código de rastreio"
                    value={currentTracking.code}
                    disabled={!isPaid || savingTracking === order.id}
                    onChange={(e) =>
                      setTrackingInputs((prev) => ({
                        ...prev,
                        [order.id]: {
                          ...currentTracking,
                          code: e.target.value,
                        },
                      }))
                    }
                    className="h-8 text-xs flex-1 min-w-[200px]"
                  />
                  <Input
                    placeholder="Transportadora"
                    value={currentTracking.carrier}
                    disabled={!isPaid || savingTracking === order.id}
                    onChange={(e) =>
                      setTrackingInputs((prev) => ({
                        ...prev,
                        [order.id]: {
                          ...currentTracking,
                          carrier: e.target.value,
                        },
                      }))
                    }
                    className="h-8 text-xs w-44"
                  />
                  <Button
                    size="sm"
                    disabled={!isPaid || savingTracking === order.id || !currentTracking.code.trim()}
                    onClick={() => handleSaveTracking(order.id)}
                    className="h-8 text-xs"
                  >
                    {savingTracking === order.id ? "Salvando..." : "Salvar Rastreio"}
                  </Button>
                </div>

                {fulfillment?.tracking_code && (
                  <div className="mt-2 text-xs text-success flex items-center gap-1 font-medium">
                    Código salvo: {fulfillment.tracking_carrier} — {fulfillment.tracking_code}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SellerSalesManager({ storeId, transactions }: { storeId: string; transactions: any[] }) {
  const { data: payoutOrders = [] } = useQuery({
    queryKey: ["store-payouts", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,status,payment_status,payout_status,payout_released_at,order_items!inner(store_id,seller_amount)")
        .eq("order_items.store_id", storeId)
        .eq("payment_status", "paid");
      if (error) throw error;
      return data ?? [];
    },
  });

  const held = payoutOrders
    .filter((o: any) => o.payout_status === "held")
    .reduce((sum: number, o: any) => sum + o.order_items.reduce((s: number, i: any) => s + Number(i.seller_amount), 0), 0);
  const released = payoutOrders
    .filter((o: any) => o.payout_status === "released")
    .reduce((sum: number, o: any) => sum + o.order_items.reduce((s: number, i: any) => s + Number(i.seller_amount), 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" /> A liberar (aguardando entrega)
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{brl(held)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            O valor de cada venda é liberado quando o pedido chega ao cliente sem reclamação.
          </p>
        </div>
        <div className="surface-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" /> Liberado para você
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{brl(released)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Vendas entregues e confirmadas.</p>
        </div>
      </div>
      <div className="surface-card p-5 text-sm text-muted-foreground">
        Total de transações registradas: {transactions.length}
      </div>
    </div>
  );
}
