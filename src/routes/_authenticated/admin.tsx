import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { 
  CheckCircle2, 
  CreditCard, 
  MessageCircle, 
  Percent, 
  Send, 
  Settings2, 
  Store, 
  Trash2, 
  Truck, 
  XCircle, 
  Gift, 
  Package 
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import {
  getDropiAdminConfiguration,
  importDropiAdminProducts,
  saveDropiAdminConfiguration,
  testDropiAdminConnection,
} from "@/lib/dropi.functions";
import { getMercadoPagoConfiguration, saveMercadoPagoConfiguration } from "@/lib/payments.functions";

// Funções de servidor que salvam direto no banco com permissão total de administrador (sem travar no RLS)
const setProductShippingAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ productId: z.string().uuid(), freeShipping: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("products")
      .update({ free_shipping: data.freeShipping })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

const setAllProductsShippingAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ freeShipping: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("products")
      .update({ free_shipping: data.freeShipping })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Admin · HS Digital" },
      {
        name: "description",
        content: "Gestão de comissão da plataforma, frete grátis e aprovação de vendedores.",
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
  const setProductShipping = useServerFn(setProductShippingAdmin);
  const setAllProductsShipping = useServerFn(setAllProductsShippingAdmin);
  const getDropiConfiguration = useServerFn(getDropiAdminConfiguration);
  const saveDropiConfiguration = useServerFn(saveDropiAdminConfiguration);
  const testDropiConnection = useServerFn(testDropiAdminConnection);
  const importDropiProducts = useServerFn(importDropiAdminProducts);
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

  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-products-shipping"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, free_shipping, stock, store_id, stores(name)")
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

  const { data: dropiConfigurations = [] } = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-dropi-config"],
    queryFn: () => getDropiConfiguration(),
  });

  const [rate, setRate] = useState("");
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  const { data: conversations = [] } = useQuery({ 
    enabled: !!isAdmin, 
    queryKey: ["admin-conversations"], 
    queryFn: async () => { 
      const { data, error } = await supabase.from("order_conversations")
        .select("id,order_id,buyer_id,subject,updated_at,order_messages(id,body,sender_id,read_at,created_at)")
        .order("updated_at", { ascending: false }); 
      if (error) throw error; 
      return data ?? []; 
    } 
  });

  useEffect(() => {
    if (settings) setRate((Number(settings.commission_rate) * 100).toFixed(2));
  }, [settings]);

  const filteredProducts = allProducts.filter((p: any) => 
    p.title.toLowerCase().includes(searchProduct.toLowerCase()) || 
    (p.stores?.name && p.stores.name.toLowerCase().includes(searchProduct.toLowerCase()))
  );

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
            <TabsList className="h-auto w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="shipping" className="flex items-center gap-1.5">
                <Truck className="h-4 w-4" /> Conceder Frete Grátis
              </TabsTrigger>
              <TabsTrigger value="sellers">Vendedores</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="payments">Mercado Pago</TabsTrigger>
              <TabsTrigger value="dropi">Dropi Nacional</TabsTrigger>
              <TabsTrigger value="transactions">Transações</TabsTrigger>
            </TabsList>

            {/* ABA: VISÃO GERAL */}
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
              <div className="grid gap-3 sm:grid-cols-3">
                <AdminMetric label="Volume processado" value={brl(transactions.reduce((sum, tx) => sum + Number(tx.gross_amount), 0))} />
                <AdminMetric label="Comissão" value={brl(transactions.filter((tx) => tx.status === "approved").reduce((sum, tx) => sum + Number(tx.platform_fee), 0))} />
                <AdminMetric label="Pagamentos aprovados" value={String(transactions.filter((tx) => tx.status === "approved").length)} />
              </div>
            </TabsContent>

            {/* ABA: CONCEDER FRETE GRÁTIS */}
            <TabsContent value="shipping" className="space-y-4 pt-4">
              <section className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold">
                      <Truck className="h-5 w-5 text-primary" /> Gestão de Frete Grátis e Descontos
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Defina quais produtos têm frete grátis concedido ou promoções de envio no marketplace.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm("Deseja conceder frete grátis para TODOS os produtos da lista?")) return;
                        try {
                          await setAllProductsShipping({ data: { freeShipping: true } });
                          toast.success("Frete grátis concedido a todos os produtos!");
                          qc.invalidateQueries({ queryKey: ["admin-products-shipping"] });
                        } catch {
                          toast.error("Erro ao aplicar frete grátis global.");
                        }
                      }}
                    >
                      Ativar para Todos
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm("Deseja remover o frete grátis de todos os produtos?")) return;
                        try {
                          await setAllProductsShipping({ data: { freeShipping: false } });
                          toast.success("Frete grátis removido de todos.");
                          qc.invalidateQueries({ queryKey: ["admin-products-shipping"] });
                        } catch {
                          toast.error("Erro ao remover frete grátis.");
                        }
                      }}
                    >
                      Desativar Todos
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <Input 
                    placeholder="Filtrar por nome do produto ou nome da loja..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3">Produto</th>
                        <th className="p-3">Loja</th>
                        <th className="p-3 text-right">Preço</th>
                        <th className="p-3 text-center">Estoque</th>
                        <th className="p-3 text-center">Status do Frete</th>
                        <th className="p-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {productsLoading ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando catálogo...</td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum produto encontrado.</td>
                        </tr>
                      ) : (
                        filteredProducts.map((p: any) => (
                          <tr key={p.id} className="hover:bg-muted/30">
                            <td className="p-3 font-medium">{p.title}</td>
                            <td className="p-3 text-xs text-muted-foreground">{p.stores?.name || "Loja HS"}</td>
                            <td className="p-3 text-right font-mono font-medium">{brl(Number(p.price))}</td>
                            <td className="p-3 text-center font-mono text-xs">{p.stock} un.</td>
                            <td className="p-3 text-center">
                              {p.free_shipping ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                                  ✓ Frete Grátis
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                  Padrão (Pago)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant={p.free_shipping ? "outline" : "default"}
                                className={p.free_shipping ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                                onClick={async () => {
                                  const novoStatus = !p.free_shipping;
                                  try {
                                    await setProductShipping({ data: { productId: p.id, freeShipping: novoStatus } });
                                    toast.success(novoStatus ? `Frete grátis ativado para ${p.title}!` : `Frete grátis removido de ${p.title}.`);
                                    qc.invalidateQueries({ queryKey: ["admin-products-shipping"] });
                                  } catch (err: any) {
                                    toast.error(err?.message || "Erro ao alterar frete do produto.");
                                  }
                                }}
                              >
                                {p.free_shipping ? "Remover Frete Grátis" : "Conceder Frete Grátis"}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </TabsContent>

            {/* ABA: MENSAGENS */}
            <TabsContent value="messages" className="pt-4">
              <section className="surface-card grid min-h-[440px] overflow-hidden md:grid-cols-[280px_1fr]">
                <aside className="border-b border-border md:border-b-0 md:border-r">
                  <h2 className="flex items-center gap-2 p-4 font-semibold">
                    <MessageCircle className="h-5 w-5 text-primary" />Mensagens
                  </h2>
                  {conversations.map((conversation) => (
                    <button 
                      key={conversation.id} 
                      type="button" 
                      onClick={() => setActiveConversation(conversation.id)} 
                      className={`block w-full border-t border-border p-4 text-left text-sm ${activeConversation === conversation.id ? "bg-primary/10" : "hover:bg-muted"}`}
                    >
                      <strong>Pedido {conversation.order_id.slice(0, 8).toUpperCase()}</strong>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.order_messages.at(-1)?.body ?? conversation.subject}</p>
                    </button>
                  ))}
                </aside>
                <div className="flex min-h-[360px] flex-col p-4">
                  {activeConversation ? (
                    <>
                      {(() => { 
                        const conversation = conversations.find((item) => item.id === activeConversation); 
                        return (
                          <div className="flex-1 space-y-2 overflow-y-auto">
                            {conversation?.order_messages.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((message) => (
                              <div key={message.id} className="rounded-lg bg-muted p-3 text-sm">
                                <p>{message.body}</p>
                                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(message.created_at).toLocaleString("pt-BR")}</p>
                              </div>
                            ))}
                          </div>
                        ); 
                      })()}
                      <form 
                        className="mt-3 flex gap-2" 
                        onSubmit={async (event) => { 
                          event.preventDefault(); 
                          if (!userId || !reply.trim()) return; 
                          const { error } = await supabase.from("order_messages").insert({ conversation_id: activeConversation, sender_id: userId, body: reply.trim() }); 
                          if (error) toast.error(error.message); 
                          else { 
                            setReply(""); 
                            await qc.invalidateQueries({ queryKey: ["admin-conversations"] }); 
                          } 
                        }}
                      >
                        <Input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Responder comprador" maxLength={2000} />
                        <Button type="submit" size="icon" aria-label="Enviar resposta"><Send /></Button>
                      </form>
                    </>
                  ) : (
                    <p className="m-auto text-sm text-muted-foreground">Selecione uma conversa.</p>
                  )}
                </div>
              </section>
            </TabsContent>

            {/* ABA: VENDEDORES */}
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
                              const { error } = await supabase.rpc("approve_seller_store", { _store_id: s.id });
                              if (error) {
                                toast.error(error.message);
                                return;
                              }
                              toast.success("Loja aprovada e acesso de vendedor liberado");
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

            {/* ABA: MERCADO PAGO */}
            <TabsContent value="payments" className="pt-4">
              <MercadoPagoSettings 
                configured={mpConfig?.configured ?? false} 
                publicKey={mpConfig?.publicKey ?? ""} 
                onSave={async (values) => { 
                  await saveMpConfiguration({ data: values }); 
                  await qc.invalidateQueries({ queryKey: ["admin-mp-config"] }); 
                }} 
              />
            </TabsContent>

            <TabsContent value="dropi" className="pt-4">
              {dropiConfigurations.length > 0 ? (
                <DropiSettings
                  configurations={dropiConfigurations}
                  onSave={async (values) => {
                    await saveDropiConfiguration({ data: values });
                    await qc.invalidateQueries({ queryKey: ["admin-dropi-config"] });
                  }}
                  onTest={(values) => testDropiConnection({ data: values })}
                  onImport={async (storeId) => {
                    const result = await importDropiProducts({ data: { storeId } });
                    await Promise.all([
                      qc.invalidateQueries({ queryKey: ["admin-dropi-config"] }),
                      qc.invalidateQueries({ queryKey: ["catalog"] }),
                    ]);
                    return result;
                  }}
                />
              ) : (
                <section className="surface-card p-6 text-sm text-muted-foreground">
                  Nenhuma loja possui integração Dropi preparada.
                </section>
              )}
            </TabsContent>

            {/* ABA: TRANSAÇÕES */}
            <TabsContent value="transactions" className="pt-4">
              <section className="surface-card overflow-hidden">
                <header className="border-b border-border p-4">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <CreditCard className="h-5 w-5 text-primary" />Transações
                  </h2>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="p-3">Pedido</th>
                        <th className="p-3">Loja</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Bruto</th>
                        <th className="p-3 text-right">Comissão</th>
                        <th className="p-3 text-right">Vendedor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="p-3 font-medium">{tx.order_id.slice(0, 8).toUpperCase()}</td>
                          <td className="p-3">{tx.stores?.name ?? "—"}</td>
                          <td className="p-3">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="p-3">{tx.status === "approved" ? "Pago" : tx.status === "pending" ? "Pendente" : tx.status}</td>
                          <td className="p-3 text-right">{brl(Number(tx.gross_amount))}</td>
                          <td className="p-3 text-right">{brl(Number(tx.platform_fee))}</td>
                          <td className="p-3 text-right">{brl(Number(tx.seller_amount))}</td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma transação registrada.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </TabsContent>
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
  return (
    <form className="surface-card p-4" onSubmit={async (event) => { event.preventDefault(); try { setSaving(true); await onSave(values); setValues((current) => ({ ...current, accessToken: "", clientSecret: "", webhookSecret: "" })); toast.success("Mercado Pago de produção configurado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível validar as credenciais."); } finally { setSaving(false); } }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Settings2 className="h-5 w-5 text-primary" />Mercado Pago</h2>
          <p className="mt-1 text-sm text-muted-foreground">Credenciais de produção protegidas. Os valores secretos nunca voltam para esta tela.</p>
        </div>
        <span className={`rounded-md px-3 py-1 text-sm font-semibold ${configured ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{configured ? "Configurado" : "Configuração pendente"}</span>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="mp-public-key">Public Key</Label><Input id="mp-public-key" required value={values.publicKey} onChange={update("publicKey")} placeholder="APP_USR-..." className="mt-1" /></div>
        <div><Label htmlFor="mp-client-id">Client ID</Label><Input id="mp-client-id" required value={values.clientId} onChange={update("clientId")} inputMode="numeric" className="mt-1" /></div>
        <div><Label htmlFor="mp-access-token">Access Token</Label><Input id="mp-access-token" required type="password" autoComplete="off" value={values.accessToken} onChange={update("accessToken")} placeholder="APP_USR-..." className="mt-1" /></div>
        <div><Label htmlFor="mp-client-secret">Client Secret</Label><Input id="mp-client-secret" required type="password" autoComplete="off" value={values.clientSecret} onChange={update("clientSecret")} className="mt-1" /></div>
        <div className="sm:col-span-2"><Label htmlFor="mp-webhook-secret">Assinatura secreta do Webhook</Label><Input id="mp-webhook-secret" required type="password" autoComplete="off" value={values.webhookSecret} onChange={update("webhookSecret")} className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">URL após publicar: https://hs-digital-hub.lovable.app/api/public/mercado-pago/webhook</p></div>
      </div>
      <Button type="submit" className="mt-4" disabled={saving}>{saving ? "Validando…" : "Validar e salvar produção"}</Button>
    </form>
  );
}

type DropiValues = {
  storeId: string;
  storeName: string;
  apiBaseUrl: string;
  integratorId: string;
  productEndpoint: string;
  marginPercent: number;
  mapping: {
    items: string;
    id: string;
    variantId: string;
    sku: string;
    title: string;
    description: string;
    price: string;
    stock: string;
    category: string;
    image: string;
    images: string;
  };
  configured: boolean;
  status: string;
  lastCatalogSyncAt: string | null;
  lastError: string | null;
};

const dropiMappingLabels: Array<[keyof DropiValues["mapping"], string, string]> = [
  ["items", "Lista de produtos", "data.products"],
  ["id", "ID do produto", "id"],
  ["variantId", "ID da variação", "variant.id"],
  ["sku", "SKU", "sku"],
  ["title", "Nome", "name"],
  ["description", "Descrição", "description"],
  ["price", "Preço de custo", "price"],
  ["stock", "Estoque", "stock"],
  ["category", "Categoria", "category.name"],
  ["image", "Foto principal", "image"],
  ["images", "Galeria de fotos", "images"],
];

function DropiSettings({ configurations, onSave, onTest, onImport }: {
  configurations: DropiValues[];
  onSave: (values: Omit<DropiValues, "storeName" | "configured" | "status" | "lastCatalogSyncAt" | "lastError">) => Promise<void>;
  onTest: (values: Omit<DropiValues, "storeName" | "configured" | "status" | "lastCatalogSyncAt" | "lastError">) => Promise<{ received: number; valid: number; sampleTitle: string | null }>;
  onImport: (storeId: string) => Promise<{ imported: number; skipped: number; received: number }>;
}) {
  const [selectedStoreId, setSelectedStoreId] = useState(configurations[0]?.storeId ?? "");
  const selected = configurations.find((item) => item.storeId === selectedStoreId) ?? configurations[0];
  const [values, setValues] = useState<DropiValues | null>(selected ?? null);
  const [working, setWorking] = useState<"save" | "test" | "import" | null>(null);

  useEffect(() => {
    const next = configurations.find((item) => item.storeId === selectedStoreId) ?? configurations[0];
    if (next) setValues(next);
  }, [configurations, selectedStoreId]);

  if (!values) return null;
  const requestValues = {
    storeId: values.storeId,
    apiBaseUrl: values.apiBaseUrl.trim(),
    integratorId: values.integratorId.trim(),
    productEndpoint: values.productEndpoint.trim(),
    marginPercent: Number(values.marginPercent),
    mapping: values.mapping,
  };
  const update = (key: "apiBaseUrl" | "integratorId" | "productEndpoint") =>
    (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => current ? { ...current, [key]: event.target.value } : current);
  const updateMapping = (key: keyof DropiValues["mapping"]) =>
    (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => current ? { ...current, mapping: { ...current.mapping, [key]: event.target.value } } : current);

  return (
    <section className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Package className="h-5 w-5 text-primary" />Dropi Nacional</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Configure o contrato fornecido pelo Dropi, valide a resposta e publique produtos reais com a margem da loja.</p>
        </div>
        <span className={`rounded-md px-3 py-1 text-sm font-semibold ${values.configured ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
          {values.configured ? "Credencial disponível" : "Configuração pendente"}
        </span>
      </div>

      {configurations.length > 1 && (
        <div className="mt-4 max-w-sm">
          <Label htmlFor="dropi-store">Loja</Label>
          <select id="dropi-store" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
            {configurations.map((item) => <option key={item.storeId} value={item.storeId}>{item.storeName}</option>)}
          </select>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="dropi-url">URL da API</Label><Input id="dropi-url" type="url" required value={values.apiBaseUrl} onChange={update("apiBaseUrl")} placeholder="https://api.fornecedor.com" className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">Use somente a URL HTTPS oficial informada pelo Dropi.</p></div>
        <div><Label htmlFor="dropi-integrator">Identificador do integrador</Label><Input id="dropi-integrator" required value={values.integratorId} onChange={update("integratorId")} autoComplete="off" className="mt-1" /></div>
        <div><Label htmlFor="dropi-endpoint">Caminho dos produtos</Label><Input id="dropi-endpoint" required value={values.productEndpoint} onChange={update("productEndpoint")} placeholder="/products" className="mt-1 font-mono" /></div>
        <div><Label htmlFor="dropi-margin">Margem sobre o custo (%)</Label><Input id="dropi-margin" type="number" min="0" max="1000" step="0.01" value={values.marginPercent} onChange={(event) => setValues((current) => current ? { ...current, marginPercent: Number(event.target.value) } : current)} className="mt-1" /></div>
        <div className="flex items-end"><p className="pb-2 text-xs text-muted-foreground">O token permanece protegido no servidor e nunca aparece nesta tela.</p></div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Mapeamento dos produtos</h3>
        <p className="mt-1 text-xs text-muted-foreground">Informe o caminho de cada campo no JSON, usando pontos para níveis internos.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dropiMappingLabels.map(([key, label, placeholder]) => (
            <div key={key}><Label htmlFor={`dropi-map-${key}`}>{label}</Label><Input id={`dropi-map-${key}`} value={values.mapping[key]} onChange={updateMapping(key)} placeholder={placeholder} className="mt-1 font-mono text-xs" /></div>
          ))}
        </div>
      </div>

      {values.lastError && <Textarea readOnly value={values.lastError} aria-label="Último erro do Dropi" className="mt-5 min-h-20 border-destructive/40 text-xs" />}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={working !== null} onClick={async () => { try { setWorking("save"); await onSave(requestValues); toast.success("Configuração do Dropi salva."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setWorking(null); } }}>{working === "save" ? "Salvando…" : "Salvar configuração"}</Button>
        <Button variant="outline" disabled={working !== null} onClick={async () => { try { setWorking("test"); const result = await onTest(requestValues); toast.success(`Conexão validada: ${result.valid} de ${result.received} produtos reconhecidos${result.sampleTitle ? `, incluindo ${result.sampleTitle}` : ""}.`); } catch (error) { toast.error(error instanceof Error ? error.message : "A conexão falhou."); } finally { setWorking(null); } }}>{working === "test" ? "Testando…" : "Testar conexão"}</Button>
        <Button variant="secondary" disabled={working !== null || !values.configured} onClick={async () => { try { setWorking("import"); const result = await onImport(values.storeId); toast.success(`${result.imported} produtos publicados; ${result.skipped} ignorados.`); } catch (error) { toast.error(error instanceof Error ? error.message : "A importação falhou."); } finally { setWorking(null); } }}>{working === "import" ? "Importando…" : "Importar para a vitrine"}</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Última importação: {values.lastCatalogSyncAt ? new Date(values.lastCatalogSyncAt).toLocaleString("pt-BR") : "ainda não realizada"}.</p>
    </section>
  );
}
