import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DollarSign, Package, Plus, ShoppingBag, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/catalog";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

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
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [category, setCategory] = useState<string>(CATEGORIES[0].slug);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="surface-card h-fit p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          let imageUrl: string | null = null;
          if (file) {
            if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
              throw new Error("Envie uma imagem de até 10 MB.");
            }
            const path = `${storeId}/${crypto.randomUUID()}-${file.name}`;
            const { error: upErr } = await supabase.storage
              .from("product-images")
              .upload(path, file);
            if (upErr) throw upErr;
            const { data: signed, error: signErr } = await supabase.storage
              .from("product-images")
              .createSignedUrl(path, 60 * 60 * 24 * 365);
            if (signErr) throw signErr;
            imageUrl = signed.signedUrl;
          }
          const { error } = await supabase.from("products").insert({
            store_id: storeId,
            title: title.trim(),
            price: Number(price),
            stock: Number(stock),
            category,
            image_url: imageUrl,
          });
          if (error) throw error;
          toast.success("Produto cadastrado!");
          setTitle("");
          setPrice("");
          setStock("1");
          setFile(null);
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
          <Label htmlFor="p-photo">Foto</Label>
          <Input
            id="p-photo"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Salvando…" : "Cadastrar produto"}
        </Button>
      </div>
    </form>
  );
}
