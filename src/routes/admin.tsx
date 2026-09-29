import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Percent, Settings2, Store, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { getMercadoPagoConfiguration, saveMercadoPagoConfiguration } from "@/lib/payments.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Admin · HS Digital" },
      {
        name: "description",
        content: "Gestão de comissão da plataforma e aprovação de vendedores.",
      },
      { property: "og:title", content: "Painel Admin · HS Digital" },
      {
        property: "og:description",
        content: "Comissão da plataforma e aprovação de lojas na HS Digital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const getMpConfiguration = useServerFn(getMercadoPagoConfiguration);
  const saveMpConfiguration = useServerFn(saveMercadoPagoConfiguration);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: isAdmin } = useQuery({
    enabled: !!userId,
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
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

  const { data: transactions = [] } = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_transactions")
        .select("id,order_id,status,gross_amount,platform_fee,seller_amount,payment_method,created_at,stores(name)")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: mpConfig } = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-mp-config"],
    queryFn: () => getMpConfiguration(),
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
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="sellers">Vendedores</TabsTrigger><TabsTrigger value="payments">Mercado Pago</TabsTrigger><TabsTrigger value="transactions">Transações</TabsTrigger></TabsList>
            <TabsContent value="overview" className="space-y-4 pt-4">
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
                    min="0"
                    max="100"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="mt-1 w-32"
                  />
                </div>
                <Button
                  onClick={async () => {
                    const parsedRate = Number(rate);
                    if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
                      toast.error("Informe uma taxa entre 0% e 100%.");
                      return;
                    }
                    const { error } = await supabase
                      .from("platform_settings")
                      .update({
                        commission_rate: parsedRate / 100,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", true);
                    if (error) {
                      toast.error(error.message);
                      return;
                    }
                    toast.success("Comissão atualizada");
                    qc.invalidateQueries({ queryKey: ["platform-settings"] });
                    qc.invalidateQueries({ queryKey: ["commission-rate"] });
                  }}
                >
                  Salvar
                </Button>
              </div>
            </section>
            <div className="grid gap-3 sm:grid-cols-3"><AdminMetric label="Volume processado" value={brl(transactions.reduce((sum, tx) => sum + Number(tx.gross_amount), 0))} /><AdminMetric label="Comissão" value={brl(transactions.filter((tx) => tx.status === "approved").reduce((sum, tx) => sum + Number(tx.platform_fee), 0))} /><AdminMetric label="Pagamentos aprovados" value={String(transactions.filter((tx) => tx.status === "approved").length)} /></div>
            </TabsContent>
            <TabsContent value="sellers" className="pt-4">
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
                      <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const { error } = await supabase
                            .from("stores")
                            .update({ status: "approved" })
                            .eq("id", s.id);
                          if (error) {
                            toast.error(error.message);
                            return;
                          }
                          toast.success("Loja aprovada");
                          qc.invalidateQueries({ queryKey: ["all-stores"] });
                        }}
                      >
                        Aprovar
                      </Button>
                      <Button variant="outline" size="sm" onClick={async () => { const { error } = await supabase.from("stores").update({ status: "rejected" }).eq("id", s.id); if (error) toast.error(error.message); else { toast.success("Solicitação recusada"); await qc.invalidateQueries({ queryKey: ["all-stores"] }); } }}><XCircle />Recusar</Button>
                      <Button variant="ghost" size="icon" aria-label="Excluir solicitação" className="text-destructive" onClick={async () => { if (!window.confirm("Excluir esta solicitação de vendedor?")) return; const { error } = await supabase.from("stores").delete().eq("id", s.id); if (error) toast.error("A solicitação possui dados vinculados e não pode ser excluída."); else await qc.invalidateQueries({ queryKey: ["all-stores"] }); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
            </TabsContent>
            <TabsContent value="payments" className="pt-4"><MercadoPagoSettings configured={mpConfig?.configured ?? false} publicKey={mpConfig?.publicKey ?? ""} onSave={async (values) => { await saveMpConfiguration({ data: values }); await qc.invalidateQueries({ queryKey: ["admin-mp-config"] }); }} /></TabsContent>
            <TabsContent value="transactions" className="pt-4"><section className="surface-card overflow-hidden"><header className="border-b border-border p-4"><h2 className="flex items-center gap-2 font-semibold"><CreditCard className="h-5 w-5 text-primary" />Transações</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Pedido</th><th className="p-3">Loja</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3 text-right">Bruto</th><th className="p-3 text-right">Comissão</th><th className="p-3 text-right">Vendedor</th></tr></thead><tbody className="divide-y divide-border">{transactions.map((tx) => <tr key={tx.id}><td className="p-3 font-medium">{tx.order_id.slice(0, 8).toUpperCase()}</td><td className="p-3">{tx.stores?.name ?? "—"}</td><td className="p-3">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</td><td className="p-3">{tx.status === "approved" ? "Pago" : tx.status === "pending" ? "Pendente" : tx.status}</td><td className="p-3 text-right">{brl(Number(tx.gross_amount))}</td><td className="p-3 text-right">{brl(Number(tx.platform_fee))}</td><td className="p-3 text-right">{brl(Number(tx.seller_amount))}</td></tr>)}{transactions.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma transação registrada.</td></tr>}</tbody></table></div></section></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return <div className="surface-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function MercadoPagoSettings({ configured, publicKey, onSave }: { configured: boolean; publicKey: string; onSave: (values: { publicKey: string; accessToken: string; clientId: string; clientSecret: string; webhookSecret: string }) => Promise<void> }) {
  const [values, setValues] = useState({ publicKey, accessToken: "", clientId: "", clientSecret: "", webhookSecret: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues((current) => ({ ...current, publicKey })), [publicKey]);
  const update = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [key]: event.target.value }));
  return <form className="surface-card p-4" onSubmit={async (event) => { event.preventDefault(); try { setSaving(true); await onSave(values); setValues((current) => ({ ...current, accessToken: "", clientSecret: "", webhookSecret: "" })); toast.success("Mercado Pago de produção configurado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível validar as credenciais."); } finally { setSaving(false); } }}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Settings2 className="h-5 w-5 text-primary" />Mercado Pago</h2><p className="mt-1 text-sm text-muted-foreground">Credenciais de produção protegidas. Os valores secretos nunca voltam para esta tela.</p></div><span className={`rounded-md px-3 py-1 text-sm font-semibold ${configured ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{configured ? "Configurado" : "Configuração pendente"}</span></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="mp-public-key">Public Key</Label><Input id="mp-public-key" required value={values.publicKey} onChange={update("publicKey")} placeholder="APP_USR-..." className="mt-1" /></div><div><Label htmlFor="mp-client-id">Client ID</Label><Input id="mp-client-id" required value={values.clientId} onChange={update("clientId")} inputMode="numeric" className="mt-1" /></div><div><Label htmlFor="mp-access-token">Access Token</Label><Input id="mp-access-token" required type="password" autoComplete="off" value={values.accessToken} onChange={update("accessToken")} placeholder="APP_USR-..." className="mt-1" /></div><div><Label htmlFor="mp-client-secret">Client Secret</Label><Input id="mp-client-secret" required type="password" autoComplete="off" value={values.clientSecret} onChange={update("clientSecret")} className="mt-1" /></div><div className="sm:col-span-2"><Label htmlFor="mp-webhook-secret">Assinatura secreta do Webhook</Label><Input id="mp-webhook-secret" required type="password" autoComplete="off" value={values.webhookSecret} onChange={update("webhookSecret")} className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">URL após publicar: https://hs-digital-hub.lovable.app/api/public/mercado-pago/webhook</p></div></div>
    <Button type="submit" className="mt-4" disabled={saving}>{saving ? "Validando…" : "Validar e salvar produção"}</Button>
  </form>;
}
