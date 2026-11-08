import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LIMIT = 30;

export function SellerStampCarouselTab({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: activeIds = [] } = useQuery({
    queryKey: ["seller-stamp-carousel-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hs_stamp_carousel").select("product_id").order("created_at");
      if (error) throw error;
      return (data ?? []).map((r) => r.product_id);
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["seller-stamp-carousel-products", storeId, search, activeIds],
    queryFn: async () => {
      let q = supabase.from("products").select("id,title,price,compare_at_price,image_url,category")
        .eq("store_id", storeId).eq("is_active", true);
      q = search.trim() ? q.ilike("title", `%${search.trim().replace(/[%_]/g, "")}%`) : q.eq("category", "estampas");
      const { data, error } = await q.order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      const active = activeIds.length
        ? (await supabase.from("products").select("id,title,price,compare_at_price,image_url,category").in("id", activeIds)).data ?? []
        : [];
      const map = new Map([...active, ...(data ?? [])].map((p) => [p.id, p]));
      return [...map.values()];
    },
  });

  const apply = async (id: string, include: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("manage_hs_stamp_carousel", { _store_id: storeId, _product_ids: [id], _include: include });
    setBusy(false);
    if (error) return toast.error(error.message);
    await Promise.all([qc.invalidateQueries({ queryKey: ["seller-stamp-carousel-ids"] }), qc.invalidateQueries({ queryKey: ["hs-stamp-carousel"] })]);
    toast.success(include ? "Adicionado ao HS Estampas." : "Retirado do HS Estampas.");
  };

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-border bg-muted/40 p-4">
        <h2 className="font-semibold">Carrossel HS Estampas</h2>
        <p className="mt-1 text-sm text-muted-foreground">{activeIds.length} de {LIMIT} produtos no carrossel. Sem busca, mostra suas estampas.</p>
      </div>
      <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input aria-label="Buscar produtos" placeholder="Buscar produtos" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const on = activeIds.includes(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              {p.image_url && <img src={p.image_url} alt={p.title} className="size-12 rounded border object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">{brl(Number(p.price))}{on ? " · No carrossel" : ""}</p>
              </div>
              {on
                ? <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(p.id, false)}><Trash2 className="size-4" />Retirar</Button>
                : <Button size="sm" disabled={busy || activeIds.length >= LIMIT} onClick={() => apply(p.id, true)}><Plus className="size-4" />Adicionar</Button>}
            </div>
          );
        })}
        {!products.length && <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
      </div>
    </section>
  );
}
