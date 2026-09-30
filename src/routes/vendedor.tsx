import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DollarSign, ExternalLink, Image, Package, Plus, ShoppingBag, Truck, Trash2, TrendingUp, Video, WalletCards } from "lucide-react";
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

const deliverySteps = [
  ["confirmed", "Pedido confirmado"],
  ["preparing", "Em separação"],
  ["shipped", "Enviado"],
  ["out_for_delivery", "Saiu para entrega"],
  ["delivered", "Entregue"],
] as const;

export const Route = createFileRoute("/vendedor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seller Center · HS Digital" },
      { name: "description", content: "Gerencie sua loja, produtos e vendas na HS Digital." },
      { property: "og:title", content: "Seller Center · HS Digital" },
      {
        property: "og:description",
        content: "Painel do vendedor da HS Digital: saldo, vendas e produtos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SellerCenter,
});

function SellerCenter() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const startConnection = useServerFn(startMercadoPagoConnection);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUserId(session?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: store } = useQuery({
    enabled: !!userId,
    queryKey: ["my-store", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: isSeller } = useQuery({
    enabled: !!userId,
    queryKey: ["is-seller", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "seller")
        .maybeSingle();
      return !!data;
    },
  });

  const { data: products = [] } = useQuery({
    enabled: !!store?.id,
    queryKey: ["store-products", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const paths = rows.map((product) => product.image_url).filter((url): url is string => typeof url === "string" && !url.startsWith("http") && !url.startsWith("/"));
      if (paths.length === 0) return rows;
      const { data: signed } = await supabase.storage.from("product-images").createSignedUrls(paths, 60 * 60);
      const urls = new Map(paths.map((path, index) => [path, signed?.[index]?.signedUrl ?? path]));
      return rows.map((product) => ({ ...product, image_url: product.image_url ? urls.get(product.image_url) ?? product.image_url : null }));
    },
  });

  const { data: todaySales = { count: 0, amount: 0 } } = useQuery({
    enabled: !!store?.id,
    queryKey: ["today-sales", store?.id],
    queryFn: async () => {
      if (!store?.id) return { count: 0, amount: 0 };
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity,seller_amount")
        .eq("store_id", store.id)
        .gte("created_at", start.toISOString());
      if (error) throw error;
      return {
        count: (data ?? []).reduce((s, i) => s + i.quantity, 0),
        amount: (data ?? []).reduce((s, i) => s + Number(i.seller_amount), 0),
      };
    },
  });

  const { data: transactions = [] } = useQuery({
    enabled: !!store?.id,
    queryKey: ["seller-transactions", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase.from("payment_transactions")
        .select("id,order_id,status,gross_amount,platform_fee,seller_amount,payment_method,created_at")
        .eq("store_id", store.id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sellerOrders = [] } = useQuery({
    enabled: !!store?.id,
    queryKey: ["seller-orders", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id,title,quantity,orders(id,status,payment_status,created_at,shipping_address),stores!inner(id)")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const grouped = new Map<string, { order: NonNullable<(typeof data)[number]["orders"]>; items: string[] }>();
      for (const row of data ?? []) {
        if (!row.orders) continue;
        const current = grouped.get(row.order_id) ?? { order: row.orders, items: [] };
        current.items.push(`${row.quantity}x ${row.title}`);
        grouped.set(row.order_id, current);
      }
      const orderIds = [...grouped.keys()];
      const { data: tracking, error: trackingError } = orderIds.length
        ? await supabase.from("order_tracking_events").select("order_id,status,created_at").in("order_id", orderIds).order("created_at", { ascending: false })
        : { data: [], error: null };
      if (trackingError) throw trackingError;
      return [...grouped.values()].map((entry) => ({
        ...entry,
        latestStatus: tracking?.find((event) => event.order_id === entry.order.id)?.status
          ?? (entry.order.payment_status === "approved" ? "confirmed" : ""),
      }));
    },
  });

  if (userId === undefined) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Shell>
    );
  }

  if (!userId) {
    return (
      <Shell>
        <div className="surface-card p-8 text-center">
          <h2 className="font-display text-xl font-bold">Acesse sua conta de vendedor</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para ver saldo, vendas do dia e cadastrar produtos.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (isSeller === undefined) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Carregando perfil…</p>
      </Shell>
    );
  }

  if (isSeller === false) {
    return (
      <Shell>
        <div className="surface-card p-8 text-center">
          <h2 className="font-display text-xl font-bold">Conta de Comprador</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Para abrir uma loja, crie uma conta escolhendo o perfil Vendedor.
          </p>
        </div>
      </Shell>
    );
  }

  if (!store) {
    return (
      <Shell>
        <CreateStoreForm
          userId={userId}
          onDone={() => qc.invalidateQueries({ queryKey: ["my-store"] })}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            <span className={store.status === "approved" ? "text-success" : "text-primary"}>
              {store.status === "approved" ? "Aprovada" : "Aguardando aprovação"}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat icon={DollarSign} label="Saldo disponível" value={brl(Number(store.balance))} />
        <Stat icon={TrendingUp} label="Vendas de hoje" value={brl(todaySales.amount)} />
        <Stat icon={ShoppingBag} label="Itens vendidos hoje" value={String(todaySales.count)} />
      </div>

      <section className="surface-card mt-4 flex flex-wrap items-center justify-between gap-4 p-4">
        <div><h2 className="flex items-center gap-2 font-semibold"><WalletCards className="h-5 w-5 text-primary" />Carteira Mercado Pago</h2><p className="mt-1 text-sm text-muted-foreground">Receba automaticamente o valor líquido das vendas após a comissão.</p></div>
        {store.mercado_pago_status === "connected" ? <span className="rounded-md bg-success/10 px-3 py-2 text-sm font-semibold text-success">Conta conectada</span> : <Button onClick={async () => { try { const result = await startConnection({ data: { storeId: store.id, origin: window.location.origin } }); window.location.assign(result.url); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível conectar."); } }}><ExternalLink />Conectar Mercado Pago</Button>}
      </section>

     <Tabs defaultValue="orders" className="mt-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="orders">Pedidos e Envios</TabsTrigger>
          <TabsTrigger value="products">Meus produtos</TabsTrigger>
          <TabsTrigger value="create">Cadastrar produto</TabsTrigger>
          <TabsTrigger value="sales">Vendas e pagamentos</TabsTrigger>
          <TabsTrigger value="orders">Painel do Vendedor</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="pt-4">
          <SellerOrdersTab storeId={store.id} />
        </TabsContent>
        <TabsContent value="products" className="pt-4">
          <section className="surface-card p-4">
          <h2 className="text-base font-semibold">Meus produtos ({products.length})</h2>
          <ul className="mt-3 divide-y divide-border">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.title}
                    loading="lazy"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Estoque: {p.stock} · {p.category}
                  </p>
                </div>
                <span className="font-display font-bold text-primary">{brl(Number(p.price))}</span>
              </li>
            ))}
            {products.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Nenhum produto cadastrado ainda.
              </li>
            )}
          </ul>
          </section>
        </TabsContent>
        <TabsContent value="create" className="pt-4"><div className="max-w-xl"><ProductForm storeId={store.id} onCreated={() => qc.invalidateQueries({ queryKey: ["store-products"] })} /></div></TabsContent>
        <TabsContent value="sales" className="pt-4"><section className="surface-card overflow-hidden"><header className="border-b border-border p-4"><h2 className="font-semibold">Vendas e pagamentos</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Pedido</th><th className="p-3">Data</th><th className="p-3">Pagamento</th><th className="p-3 text-right">Bruto</th><th className="p-3 text-right">Comissão</th><th className="p-3 text-right">Líquido</th></tr></thead><tbody className="divide-y divide-border">{transactions.map((tx) => <tr key={tx.id}><td className="p-3 font-medium">{tx.order_id.slice(0, 8).toUpperCase()}</td><td className="p-3">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</td><td className="p-3">{tx.status === "approved" ? "Pago" : tx.status === "pending" ? "Pendente" : tx.status}</td><td className="p-3 text-right">{brl(Number(tx.gross_amount))}</td><td className="p-3 text-right">{brl(Number(tx.platform_fee))}</td><td className="p-3 text-right font-semibold text-success">{brl(Number(tx.seller_amount))}</td></tr>)}{transactions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma venda registrada.</td></tr>}</tbody></table></div></section></TabsContent>
        <TabsContent value="orders" className="pt-4">
          <section className="surface-card overflow-hidden">
            <header className="border-b border-border p-4"><h2 className="flex items-center gap-2 font-semibold"><Truck className="h-5 w-5 text-primary" />Pedidos e entregas</h2></header>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Pedido</th><th className="p-3">Data</th><th className="p-3">Produtos</th><th className="p-3">Pagamento</th><th className="p-3">Etapa da entrega</th></tr></thead><tbody className="divide-y divide-border">
              {sellerOrders.map(({ order, items, latestStatus }) => <tr key={order.id}><td className="p-3 font-medium">{order.id.slice(0, 8).toUpperCase()}</td><td className="p-3">{new Date(order.created_at).toLocaleDateString("pt-BR")}</td><td className="max-w-xs p-3">{items.join(", ")}</td><td className="p-3">{order.payment_status === "approved" ? "Pago" : "Pendente"}</td><td className="p-3"><select aria-label={`Etapa do pedido ${order.id.slice(0, 8)}`} value={latestStatus} disabled={order.payment_status !== "approved"} onChange={async (event) => { const status = event.target.value as typeof deliverySteps[number][0]; if (!status) return; const { data: user } = await supabase.auth.getUser(); if (!user.user) { toast.error("Entre novamente para atualizar o pedido."); return; } const { error } = await supabase.from("order_tracking_events").insert({ order_id: order.id, status, created_by: user.user.id, note: "" }); if (error) toast.error(error.message); else { toast.success("Etapa da entrega atualizada."); await qc.invalidateQueries({ queryKey: ["seller-orders", store.id] }); } }} className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione a etapa</option>{deliverySteps.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}
              {sellerOrders.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum pedido recebido.</td></tr>}
            </tbody></table></div>
          </section>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 place-items-center rounded-lg primary-gradient text-primary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function CreateStoreForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <form
      className="surface-card mx-auto max-w-md p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const slug = name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const { error } = await supabase.from("stores").insert({
          owner_id: userId,
          name: name.trim(),
          slug: `${slug}-${Date.now().toString(36)}`,
          description: description.trim(),
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Loja criada! Aguarde a aprovação do time HS Digital.");
        onDone();
      }}
    >
      <h1 className="font-display text-xl font-bold">Abra sua loja</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastre sua loja para começar a vender no marketplace.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="store-name">Nome da loja</Label>
          <Input
            id="store-name"
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="store-desc">Descrição</Label>
          <Textarea
            id="store-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full">
          Criar loja
        </Button>
      </div>
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
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="surface-card h-fit p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          const parsedPrice = Number(price);
          const parsedStock = Number(stock);
          if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            throw new Error("Informe um preço válido.");
          }
          if (!Number.isInteger(parsedStock) || parsedStock < 0) {
            throw new Error("Informe um estoque válido.");
          }
          if (files.length > 10) throw new Error("Envie no máximo 10 fotos ou vídeos.");
          if (files.some((file) => file.type.startsWith("image/") ? file.size > 10 * 1024 * 1024 : file.type.startsWith("video/") ? file.size > 50 * 1024 * 1024 : true)) throw new Error("Fotos podem ter até 10 MB e vídeos até 50 MB.");
          if (files.length > 0 && !files.some((file) => file.type.startsWith("image/"))) throw new Error("Inclua ao menos uma foto para usar como capa.");
          if (productType === "digital" && !deliveryUrl.trim()) throw new Error("Informe o link de entrega do produto digital.");
          const uploaded: Array<{ storagePath: string; mediaType: "image" | "video"; mimeType: string; sizeBytes: number; position: number }> = [];
          try {
            for (const [position, file] of files.entries()) {
              const extension = file.name.split(".").pop()?.toLowerCase() ?? (file.type.startsWith("video/") ? "mp4" : "jpg");
              const path = `${storeId}/${crypto.randomUUID()}.${extension.replace(/[^a-z0-9]/g, "")}`;
              const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
              if (uploadError) throw uploadError;
              uploaded.push({ storagePath: path, mediaType: file.type.startsWith("video/") ? "video" : "image", mimeType: file.type, sizeBytes: file.size, position });
            }
            await createProduct({ data: { title: title.trim(), description: description.trim(), price: parsedPrice, stock: parsedStock, category, productType, deliveryUrl: deliveryUrl.trim(), media: uploaded } });
          } catch (error) {
            if (uploaded.length > 0) await supabase.storage.from("product-images").remove(uploaded.map((item) => item.storagePath));
            throw error;
          }
          toast.success("Produto cadastrado!");
          setTitle("");
          setDescription("");
          setPrice("");
          setStock("1");
          setFiles([]);
          setDeliveryUrl("");
          onCreated();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
        } finally {
          setSaving(false);
        }
      }}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Plus className="h-4 w-4 text-primary" /> Cadastrar produto
      </h2>
      <div className="mt-3 space-y-3">
        <div>
          <Label htmlFor="p-title">Título</Label>
          <Input
            id="p-title"
            required
            minLength={2}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
        </div>
        <div><Label htmlFor="p-type">Tipo de produto</Label><select id="p-type" value={productType} onChange={(e) => setProductType(e.target.value as "physical" | "digital")} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="physical">Físico</option><option value="digital">Digital</option></select></div>
        {productType === "digital" && <div><Label htmlFor="p-delivery">Link de entrega</Label><Input id="p-delivery" type="url" required value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} placeholder="https://..." className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">Visível somente ao comprador após o pagamento confirmado.</p></div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p-price">Preço (R$)</Label>
            <Input
              id="p-price"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="p-stock">Estoque</Label>
            <Input
              id="p-stock"
              type="number"
              required
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="p-cat">Categoria</Label>
          <select
            id="p-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="p-description">Descrição</Label>
          <Textarea id="p-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={6} placeholder="Descreva os detalhes, benefícios e informações importantes do produto" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="p-photo">Fotos e vídeos ({files.length}/10)</Label>
          <Input
            id="p-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              if (selected.length > 10) { toast.error("Selecione no máximo 10 mídias."); e.currentTarget.value = ""; return; }
              setFiles(selected);
            }}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">Fotos até 10 MB e vídeos até 50 MB. A primeira foto será a capa.</p>
          {files.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{files.map((file, index) => { const url = URL.createObjectURL(file); return <div key={`${file.name}-${file.lastModified}`} className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">{file.type.startsWith("video/") ? <video src={url} muted className="h-full w-full object-cover" /> : <img src={url} alt={`Prévia ${index + 1}`} className="h-full w-full object-cover" />}<span className="absolute bottom-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] text-primary-foreground">{file.type.startsWith("video/") ? <Video className="inline h-3 w-3" /> : <Image className="inline h-3 w-3" />} {index + 1}</span><Button type="button" variant="destructive" size="icon" className="absolute right-1 top-1 h-6 w-6" aria-label={`Remover mídia ${index + 1}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-3 w-3" /></Button></div>; })}</div>}
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Salvando…" : "Cadastrar produto"}
        </Button>
      </div>
    </form>
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Carregando pedidos…</p>;

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

            {/* Endereço de entrega para dropshipping */}
            {addr && (
              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">📍 Endereço de Entrega do Cliente:</p>
                <p>{addr.recipient_name || "Destinatário"} · Tel: {addr.phone || "Não informado"}</p>
                <p>{addr.street_address}{addr.complement ? `, ${addr.complement}` : ""} - {addr.city}/{addr.state} - CEP: {addr.postal_code}</p>
              </div>
            )}

            {/* Itens */}
            <div className="space-y-1 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Itens da sua loja:</p>
              {ord.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>{i.quantity}x {i.title}</span>
                  <span className="font-semibold text-success">{brl(Number(i.seller_amount))}</span>
                </div>
              ))}
            </div>

            {/* Botões de avanço de rastreio */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Atualizar entrega do pedido:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={lastEvent === "preparing" ? "secondary" : "outline"}
                  disabled={updatingId === ord.id}
                  onClick={() => addStatus(ord.id, "preparing", "Pedido em separação no fornecedor")}
                >
                  Em separação
                </Button>

                <div className="flex flex-1 min-w-[240px] gap-1">
                  <Input
                    placeholder="Código de rastreio (ex: AA123456789BR)"
                    value={trackingNote[ord.id] || ""}
                    onChange={(e) => setTrackingNote({ ...trackingNote, [ord.id]: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={updatingId === ord.id}
                    onClick={() => addStatus(ord.id, "shipped", trackingNote[ord.id] ? `Rastreio: ${trackingNote[ord.id]}` : "Enviado")}
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
                  onClick={() => addStatus(ord.id, "delivered", "Entregue ao cliente")}
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
          Nenhum pedido recebido ainda.
        </div>
      )}
    </div>
  );
}
