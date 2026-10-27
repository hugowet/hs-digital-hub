import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";

const PAGE_SIZE = 50;

type SupplierProductsPanelProps = {
  supplier: "amazon" | "cj";
  title: string;
  description: string;
};

export function SupplierProductsPanel({ supplier, title, description }: SupplierProductsPanelProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-supplier-products", supplier, page],
    queryFn: async () => {
      const { data: rows, error, count } = await supabase
        .from("products")
        .select("id, title, price, stock, is_active, created_at, supplier_cost, stores(name)", { count: "exact" })
        .eq("supplier", supplier)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { products: rows ?? [], total: count ?? 0 };
    },
  });

  const { data: activeCount = 0 } = useQuery({
    queryKey: ["admin-supplier-products-active", supplier],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("supplier", supplier)
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.products ?? [];
    return (data?.products ?? []).filter((p: any) =>
      p.title?.toLowerCase().includes(term) || p.stores?.name?.toLowerCase().includes(term),
    );
  }, [data, search]);

  return (
    <section className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Package className="h-5 w-5 text-primary" /> {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-600">
            {activeCount} ativos na vitrine
          </span>
          <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
            {data?.total ?? 0} no total
          </span>
        </div>
      </div>

      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filtrar nesta página por produto ou loja..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">Loja</th>
              <th className="p-3 text-right">Preço de venda</th>
              <th className="p-3 text-right">Custo</th>
              <th className="p-3 text-center">Estoque</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Importado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">Carregando produtos...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum produto encontrado.</td>
              </tr>
            ) : (
              filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="max-w-[320px] truncate p-3 font-medium" title={p.title}>{p.title}</td>
                  <td className="p-3 text-xs text-muted-foreground">{p.stores?.name || "Loja HS"}</td>
                  <td className="p-3 text-right font-mono font-medium">{brl(Number(p.price))}</td>
                  <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                    {p.supplier_cost != null ? brl(Number(p.supplier_cost)) : "—"}
                  </td>
                  <td className="p-3 text-center font-mono text-xs">{p.stock} un.</td>
                  <td className="p-3 text-center">
                    {p.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                        ✓ Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right text-xs text-muted-foreground">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{data?.total ?? 0} produtos · Página {page + 1}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0 || isLoading} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || (page + 1) * PAGE_SIZE >= (data?.total ?? 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </section>
  );
}
