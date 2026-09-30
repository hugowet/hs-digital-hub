import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DollarSign, ExternalLink, Image, Package, Plus, ShoppingBag, Trash2, TrendingUp, Truck, Video, WalletCards } from "lucide-react";
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

export const Route = createFileRoute("/vendedor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seller Center · HS Digital" },
      { name: "description", content: "Gerencie sua loja, produtos, vendas e pedidos na HS Digital." },
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
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: store, isLoading: storeLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["seller-store", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("stores").select("*").eq("owner_id", userId).maybeSingle();
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    enabled: !!store?.id,
    queryKey: ["store-products", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase.from("products").select("*, product_media(*)").eq("store_id", store.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: transactions = [] } = useQuery({
    enabled: !!store?.id,
    queryKey: ["store-transactions", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase.from("payment_transactions").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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
          <StoreSetupForm userId={userId} onCreated={() => qc.invalidateQueries({ queryKey: ["seller-store"] })} />
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
            <span className="rounded-md bg-success/10 px-3 py-2 text-sm font-semibold text-success">Mercado Pago Conectado</span>
          ) : (
            <Button
              onClick={async () => {
                try {
                  const result = await startConnection({ data: { storeId: store.id, origin: window.location.origin } });
                  window.location.assign(result.url);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Não foi possível conectar.");
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
          <div className="p-3 bg-primary/10 rounded-lg text-primary"><DollarSign className="h-6 w-6" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo Líquido</p>
            <p className="text-xl font-bold text-success">{brl(totalNet)}</p>
          </div>
        </div>
        <div className="surface-card p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary"><TrendingUp className="h-6 w-6" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Vendas Aprovadas</p>
            <p className="text-xl font-bold">{approvedSales.length}</p>
          </div>
        </div>
        <div className="surface-card p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary"><Package className="h-6 w-6" /></div>
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
                <div key={p.id} className="border border-border p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{brl(Number(p.price))} · Estoque: {p.stock}</p>
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
              {products.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>}
            </div>
          </section>
        </TabsContent>

        {/* Aba Cadastrar Produto */}
        <TabsContent value="create" className="pt-4">
          <div className="max-w-xl">
            <ProductForm storeId={store.id} onCreated={() => qc.invalidateQueries({ queryKey: ["store-products"] })} />
          </div>
        </TabsContent>

        {/* Aba de Vendas */}
        <TabsContent value="sales" className="pt-4">
          <section className="surface-card overflow-hidden">
            <header className="border-b border-border p-4">
              <h2 className="font-semibold">Histórico de Transações</h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="p-3">Pedido</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Bruto</th>
                    <th className="p-3 text-right">Comissão</th>
                    <th className="p-3 text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="p-3 font-medium">#{tx.order_id.slice(0, 8).toUpperCase()}</td>
                      <td className="p-3">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tx.status === "approved" ? "bg-success/10 text-success" : "bg-muted"}`}>
                          {tx.status === "approved" ? "Pago" : tx.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">{brl(Number(tx.gross_amount))}</td>
                      <td className="p-3 text-right text-muted-foreground">-{brl(Number(tx.platform_fee))}</td>
                      <td className="p-3 text-right font-semibold text-success">{brl(Number(tx.seller_amount))}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma venda registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </Shell>
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
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
        <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Minha Loja Tech" />
      </div>
      <div>
        <Label htmlFor="s-desc">Descrição</Label>
        <Input id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve resumo da loja" />
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
        const ext = file.name.split(".").pop();
        const path = `${storeId}/${Date.now()}-${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file);
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
          <Input id="p-price" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="p-stock">Estoque</Label>
          <Input id="p-stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} required />
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
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="p-desc">Descrição</Label>
        <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Detalhes do produto" />
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
          <Input id="p-url" value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} placeholder="https://..." required />
        </div>
      )}
      <div>
        <Label htmlFor="p-files">Fotos (até 10)</Label>
        <Input id="p-files" type="file" multiple accept="image/*,video/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="mt-1" />
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Cadastrando..." : "Publicar Produto"}
      </Button>
    </form>
  );
}

function SellerOrdersTab({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingNote, setTrackingNote] = useState<Record<string, string>>({});

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
      const [{ data: ordersData }, { data: trackingEvents }] = await Promise.all([
        supabase.from("orders").select("id,created_at,payment_status,total,shipping_address").in("id", orderIds).order("created_at", { ascending: false }),
        supabase.from("order_tracking_events").select("order_id,status,note,created_at").in("order_id", orderIds).order("created_at", { ascending: true }),
      ]);

      return (ordersData ?? []).map((ord) => ({
        ...ord,
        items: items.filter((i) => i.order_id === ord.id),
        events: (trackingEvents ?? []).filter((e) => e.order_id === ord.id),
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

  return (
    <div className="space-y-4">
      {orders.map((ord) => {
        const addr = ord.shipping_address as Record<string, any> | null;
        const lastEvent = ord.events.length > 0 ? ord.events[ord.events.length - 1].status : "confirmed";

        return (
          <div key={ord.id} className="surface-card p-5 border border-border rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="text-xs text-muted-foreground">Pedido #{ord.id.slice(0, 8).toUpperCase()}</span>
                <p className="text-sm font-semibold">{new Date(ord.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${ord.payment_status === "approved" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
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
                <p className="font-semibold text-foreground">📦 Endereço de Entrega do Cliente (para os Correios):</p>
                <p><strong>Destinatário:</strong> {addr.name || addr.recipient_name || "Cliente"} · Tel: {addr.phone || "Não informado"}</p>
                <p><strong>Endereço:</strong> {addr.address || addr.street_address}{addr.complement ? `, ${addr.complement}` : ""} - {addr.city}</p>
              </div>
            )}

            {/* Itens do pedido */}
            <div className="space-y-1 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Itens:</p>
              {ord.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>{i.quantity}x {i.title}</span>
                  <span className="font-semibold text-success">{brl(Number(i.seller_amount))}</span>
                </div>
              ))}
            </div>

            {/* Atualização de etapas e código de rastreio */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Atualizar envio nos Correios:</p>
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
                    onClick={() => addStatus(ord.id, "shipped", trackingNote[ord.id] ? `Rastreio Correios: ${trackingNote[ord.id]}` : "Objeto postado nos Correios")}
                  >
                    Marcar Enviado
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === ord.id}
                  onClick={() => addStatus(ord.id, "out_for_delivery", "Objeto saiu para entrega ao destinatário")}
                >
                  Saiu para entrega
                </Button>

                <Button
                  size="sm"
                  className="bg-success hover:bg-success/90 text-white"
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

      {orders.length === 0 && (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          Nenhum pedido recebido ainda nesta loja.
        </div>
      )}
    </div>
  );
}
