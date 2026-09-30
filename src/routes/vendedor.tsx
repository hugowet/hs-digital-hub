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

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [category, setCategory] = useState(CATEGORIES?.[0]?.id || "");
  const [type, setType] = useState("physical");
  const [description, setDescription] = useState(""); 

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

  const { data: sellerOrders = [], refetch: refetchOrders } = useQuery({
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

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("order_tracking_events")
        .insert([{ order_id: orderId, status: newStatus }]);

      if (error) throw error;
      toast.success("Status de entrega atualizado!");
      refetchOrders();
    } catch (e: any) {
      toast.error("Erro ao atualizar status: " + e.message);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("products").insert([
        {
          store_id: store.id,
          title,
          price: parseFloat(price),
          stock: parseInt(stock),
          category,
          type,
          description, 
        },
      ]);
      if (error) throw error;
      toast.success("Produto cadastrado com sucesso!");
      setTitle("");
      setPrice("");
      setStock("1");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["store-products"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (userId === undefined) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col">
        <SiteHeader />
        <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </main>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col">
        <SiteHeader />
        <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
          <div className="p-8 text-center bg-white border rounded-xl shadow-sm">
            <h2 className="font-display text-xl font-bold">Acesse sua conta de vendedor</h2>
            <p className="mt-2 text-sm text-muted-foreground">Entrar para ver saldo, vendas do dia e cadastrar produtos.</p>
            <Button asChild className="mt-4"><Link to="/auth">Entrar</Link></Button>
          </div>
        </main>
      </div>
    );
  }

  if (isSeller === undefined) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col">
        <SiteHeader />
        <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground">Carregando perfil…</p>
        </main>
      </div>
    );
  }

  if (isSeller === false) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col">
        <SiteHeader />
        <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
          <div className="p-8 text-center bg-white border rounded-xl shadow-sm">
            <h2 className="font-display text-xl font-bold">Conta de Comprador</h2>
