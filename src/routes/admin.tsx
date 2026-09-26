import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, Percent, Store } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Admin · HS Digital" },
      { name: "description", content: "Gestão de comissão da plataforma e aprovação de vendedores." },
      { property: "og:title", content: "Painel Admin · HS Digital" },
      { property: "og:description", content: "Comissão da plataforma e aprovação de lojas na HS Digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: isAdmin } = useQuery({
    enabled: !!userId,
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: stores = [] } = useQuery({
    enabled: !!isAdmin,
    queryKey: ["all-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [rate, setRate] = useState("");
  useEffect(() => {
    if (settings) setRate((Number(settings.commission_rate) * 100).toFixed(2));
  }, [settings]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Painel Admin</h1>

        {userId === null && (
          <div className="surface-card mt-6 p-8 text-center">
            <p className="text-sm text-muted-foreground">Entre com uma conta de administrador.</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        )}

        {userId && !isAdmin && (
          <p className="surface-card mt-6 p-8 text-center text-sm text-muted-foreground">
            Sua conta não tem permissão de administrador.
          </p>
        )}

        {isAdmin && (
          <div className="mt-6 space-y-4">
            <section className="surface-card p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Percent className="h-4 w-4 text-primary" /> Comissão da plataforma
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Percentual retido pela HS Digital em cada venda; o restante é repassado ao vendedor.
              </p>
              <div className="mt-3 flex items-end gap-3">
                <div>
                  <Label htmlFor="rate">Taxa (%)</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="mt-1 w-32"
                  />
                </div>
                <Button
                  onClick={async () => {
                    const { error } = await supabase
                      .from("platform_settings")
                      .update({ commission_rate: Number(rate) / 100, updated_at: new Date().toISOString() })
                      .eq("id", true);
                    if (error) { toast.error(error.message); return; }
                    toast.success("Comissão atualizada");
                    qc.invalidateQueries({ queryKey: ["platform-settings"] });
                    qc.invalidateQueries({ queryKey: ["commission-rate"] });
                  }}
                >
                  Salvar
                </Button>
              </div>
            </section>

            <section className="surface-card p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Store className="h-4 w-4 text-primary" /> Vendedores
              </h2>
              <ul className="mt-3 divide-y divide-border">
                {stores.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Saldo {brl(Number(s.balance))} ·{" "}
                        {s.status === "approved" ? "Aprovada" : "Pendente"}
                      </p>
                    </div>
                    {s.status !== "approved" ? (
                      <Button
                        size="sm"
                        onClick={async () => {
                          const { error } = await supabase
                            .from("stores")
                            .update({ status: "approved" })
                            .eq("id", s.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success("Loja aprovada");
                          qc.invalidateQueries({ queryKey: ["all-stores"] });
                        }}
                      >
                        Aprovar
                      </Button>
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
