import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DollarSign, ExternalLink, Image, Package, Plus, ShoppingBag, Trash2, TrendingUp, Video, WalletCards } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      return data ?? [];
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

      <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
        <ProductForm
          storeId={store.id}
          onCreated={() => qc.invalidateQueries({ queryKey: ["store-products"] })}
        />

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
      </div>
      <section className="surface-card mt-4 overflow-hidden"><header className="border-b border-border p-4"><h2 className="font-semibold">Vendas e pagamentos</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Pedido</th><th className="p-3">Data</th><th className="p-3">Pagamento</th><th className="p-3 text-right">Bruto</th><th className="p-3 text-right">Comissão</th><th className="p-3 text-right">Líquido</th></tr></thead><tbody className="divide-y divide-border">{transactions.map((tx) => <tr key={tx.id}><td className="p-3 font-medium">{tx.order_id.slice(0, 8).toUpperCase()}</td><td className="p-3">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</td><td className="p-3">{tx.status === "approved" ? "Pago" : tx.status === "pending" ? "Pendente" : tx.status}</td><td className="p-3 text-right">{brl(Number(tx.gross_amount))}</td><td className="p-3 text-right">{brl(Number(tx.platform_fee))}</td><td className="p-3 text-right font-semibold text-success">{brl(Number(tx.seller_amount))}</td></tr>)}{transactions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma venda registrada.</td></tr>}</tbody></table></div></section>
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
            await createProduct({ data: { title: title.trim(), price: parsedPrice, stock: parsedStock, category, productType, deliveryUrl: deliveryUrl.trim(), media: uploaded } });
          } catch (error) {
            if (uploaded.length > 0) await supabase.storage.from("product-images").remove(uploaded.map((item) => item.storagePath));
            throw error;
          }
          toast.success("Produto cadastrado!");
          setTitle("");
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
  );
}
