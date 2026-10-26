import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listAudienceAccounts } from "@/lib/audience.functions";

export function AudienceAccountsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const list = useServerFn(listAudienceAccounts);
  const [filter, setFilter] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-audience-accounts"],
    queryFn: () => list(),
    enabled: open,
    staleTime: 30_000,
  });
  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (data ?? []).filter((a) => !f || `${a.name ?? ""} ${a.email ?? ""}`.toLowerCase().includes(f));
  }, [data, filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Contas cadastradas {data ? `(${data.length})` : ""}</DialogTitle>
        </DialogHeader>
        <Input placeholder="Buscar por nome ou e-mail" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>}
          {error && <p className="py-6 text-center text-sm text-destructive">Não foi possível carregar as contas.</p>}
          {rows.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium">{a.name || "Sem nome"}</p>
                <p className="truncate text-sm text-muted-foreground">{a.email || "Sem e-mail"}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
