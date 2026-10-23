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
  Pencil,
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

  const [activeTab, setActiveTab] = useState("orders");

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setEditTitle(p.title || "");
    setEditPrice(p.price ? String(p.price) : "");
    setEditCompareAt(p.compare_at_price ? String(p.compare_at_price) : "");
    setEditSupplierCost(p.supplier_cost ? String(p.supplier_cost) : "");
    setEditStock(p.stock !== undefined ? String(p.stock) : "999");
    setEditImageUrl(p.image_url || "");
    setEditDescription(p.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (!editTitle.trim()) return toast.error("O título do produto é obrigatório.");
    if (!editPrice || Number(editPrice) <= 0) return toast.error("Informe um preço de venda válido.");

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          title: editTitle.trim(),
          price: Number(editPrice),
          compare_at_price: editCompareAt ? Number(editCompareAt) : null,
          supplier_cost: editSupplierCost ? Number(editSupplierCost) : null,
          stock: Number(editStock) || 0,
          image_url: editImageUrl.trim(),
          description: editDescription.trim(),
          description_long: editDescription.trim(),
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      toast.success("Produto atualizado com sucesso!");
      setEditingProduct(null);
      qc.invalidateQueries({ queryKey: ["store-products"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alterações do produto.");
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
        <div className="mx-auto max-w-md py-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Nenhuma loja encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você ainda não tem uma loja cadastrada como vendedor.
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto border-b">
          <TabsTrigger value="orders">Pedidos e Envios</TabsTrigger>
          <TabsTrigger value="products">Meus produtos</TabsTrigger>
          <TabsTrigger value="create">Cadastrar produto</TabsTrigger>
          <TabsTrigger value="sales">Vendas e extrato</TabsTrigger>
          <TabsTrigger value="mercadopago">Mercado Pago</TabsTrigger>
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
          <div className="max-w-xl">
            <div className="mb-4 rounded-md border border-border bg-muted/40 p-4">
              <h2 className="font-semibold">Venda com estoque próprio</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre normalmente seus produtos, defina preço e estoque e cuide do envio após a venda.
              </p>
            </div>
            <ProductForm
              storeId={store.id}
              onCreated={() => qc.invalidateQueries({ queryKey: ["store-products"] })}
            />
          </div>
        </TabsContent>

        {/* Aba de Vendas e Extrato */}
        <TabsContent value="sales" className="pt-4">
          <SellerSalesManager storeId={store.id} transactions={transactions} />
        </TabsContent>

        {/* Aba Mercado Pago da Loja */}
        <TabsContent value="mercadopago" className="pt-4">
          <SellerMercadoPagoTab
            store={store}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["seller-store"] })}
          />
        </TabsContent>

        {/* Aba Fornecedores */}
        <TabsContent value="suppliers" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <section className="surface-card p-5">
              <Package className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-semibold">Venda seus produtos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use seu próprio estoque, suas fotos e seu envio.
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
              </div>
            </section>
          </div>
        </TabsContent>

        {/* Aba Importador Amazon */}
        <TabsContent value="amazon-affiliate" className="pt-4">
          <AmazonAffiliateImporter />
        </TabsContent>
      </Tabs>

      {/* MODAL DE EDIÇÃO DE PRODUTO */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Altere o título, preços de venda e custo, estoque ou descrição.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Título do Produto</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-price">Preço de Venda (R$)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-compare">Preço Riscado / De (R$)</Label>
                <Input
                  id="edit-compare"
                  type="number"
                  step="0.01"
                  placeholder="Opcional"
                  value={editCompareAt}
                  onChange={(e) => setEditCompareAt(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cost">Preço de Custo (R$)</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  placeholder="Opcional"
                  value={editSupplierCost}
                  onChange={(e) => setEditSupplierCost(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-stock">Estoque Disponível</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-img">URL da Imagem Principal</Label>
              <Input
                id="edit-img"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Descrição</Label>
              <Textarea
                id="edit-desc"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingProduct(null)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {savingEdit ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function SellerMercadoPagoTab({ store, onRefresh }: { store: any; onRefresh: () => void }) {
  const startConnection = useServerFn(startMercadoPagoConnection);
  const [connecting, setConnecting] = useState(false);

  const isConnected = store.mercado_pago_status === "connected";

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const res = await startConnection({
        storeId: store.id,
        origin: window.location.origin,
      });
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar conta Mercado Pago.");
      setConnecting(false);
    }
  };

  return (
    <div className="surface-card p-6 max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <WalletCards className="h-7 w-7 text-primary" />
        <div>
          <h2 className="text-lg font-bold">Carteira Mercado Pago</h2>
          <p className="text-sm text-muted-foreground">
            Conecte sua conta do Mercado Pago para receber pagamentos e repasses das suas vendas.
          </p>
        </div>
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

function ProductForm({ storeId, onCreated }: { storeId: string; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]?.slug ?? "geral");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedPrice = parseFloat(price.replace(",", "."));
      const parsedCostPrice = costPrice ? parseFloat(costPrice.replace(",", ".")) : undefined;
      const parsedStock = parseInt(stock, 10);
      const media = imageUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url, i) => ({
          media_type: "image" as const,
          url,
          is_primary: i === 0,
        }));

      await createSellerProduct({
        data: {
          storeId,
          title: title.trim(),
          price: parsedPrice,
          costPrice: parsedCostPrice,
          stock: parsedStock,
          category,
          description: description.trim(),
          media,
        },
      });

      toast.success("Produto cadastrado com sucesso!");
      setTitle("");
      setPrice("");
      setCostPrice("");
      setStock("");
      setDescription("");
      setImageUrls("");
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

      <div className="space-y-1.5">
        <Label htmlFor="form-img">URLs das imagens (uma por linha)</Label>
        <Textarea
          id="form-img"
          rows={2}
          value={imageUrls}
          onChange={(e) => setImageUrls(e.target.value)}
          placeholder="https://exemplo.com/foto1.jpg"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Cadastrando..." : "Publicar produto"}
      </Button>
    </form>
  );
}

function SellerOrdersTab({ storeId }: { storeId: string }) {
  return (
    <div className="surface-card p-5 text-sm text-muted-foreground">
      Nenhum pedido recente registrado.
    </div>
  );
}

function SellerSalesManager({ storeId, transactions }: { storeId: string; transactions: any[] }) {
  return (
    <div className="surface-card p-5 text-sm text-muted-foreground">
      Total de transações registradas: {transactions.length}
    </div>
  );
}
