import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({ meta: [
    { title: "Minha conta · HS Digital" },
    { name: "description", content: "Consulte os dados da sua conta HS Digital." },
    { property: "og:title", content: "Minha conta · HS Digital" },
    { property: "og:description", content: "Dados da sua conta HS Digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [form, setForm] = useState({ label: "Casa", recipient_name: "", phone: "", street_address: "", city: "", state: "", postal_code: "", complement: "" });
  const { data: profile } = useQuery({ queryKey: ["my-profile", user.id], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("full_name,phone,account_type").eq("id", user.id).maybeSingle(); if (error) throw error; return data; } });
  const { data: addresses = [] } = useQuery({ queryKey: ["my-addresses", user.id], queryFn: async () => { const { data, error } = await supabase.from("user_addresses").select("*").order("is_default", { ascending: false }).order("created_at"); if (error) throw error; return data ?? []; } });
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto w-full max-w-3xl px-4 py-8"><h1 className="text-2xl font-bold">Minha conta</h1><section className="surface-card mt-6 p-5"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><UserRound /></span><div><p className="font-semibold">{profile?.full_name ?? "Cliente HS Digital"}</p><p className="text-sm text-muted-foreground">{profile?.account_type === "seller" ? "Vendedor" : "Comprador"}</p></div></div><div className="mt-5 border-t border-border pt-4"><p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{user.email}</p>{profile?.phone && <p className="mt-2 text-sm text-muted-foreground">Telefone: {profile.phone}</p>}</div></section>
  <section className="surface-card mt-5 p-5"><h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5 text-primary" />Meus endereços</h2><div className="mt-4 space-y-3">{addresses.map((address) => <div key={address.id} className="flex items-start gap-3 rounded-lg border border-border p-3"><div className="min-w-0 flex-1"><p className="font-medium">{address.label} {address.is_default && <span className="ml-2 text-xs text-success">Padrão</span>}</p><p className="text-sm text-muted-foreground">{address.recipient_name} · {address.phone}</p><p className="text-sm text-muted-foreground">{address.street_address}{address.complement ? `, ${address.complement}` : ""} · {address.city}/{address.state} · {address.postal_code}</p>{!address.is_default && <Button variant="link" className="h-auto px-0 py-1 text-xs" onClick={async () => { await supabase.from("user_addresses").update({ is_default: true }).eq("id", address.id); await qc.invalidateQueries({ queryKey: ["my-addresses"] }); }}>Usar como padrão</Button>}</div><Button variant="ghost" size="icon" aria-label="Excluir endereço" onClick={async () => { const { error } = await supabase.from("user_addresses").delete().eq("id", address.id); if (error) toast.error(error.message); else await qc.invalidateQueries({ queryKey: ["my-addresses"] }); }}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
  <form className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); const { error } = await supabase.from("user_addresses").insert({ ...form, user_id: user.id, is_default: addresses.length === 0 }); if (error) { toast.error(error.message); return; } setForm({ label: "Casa", recipient_name: "", phone: "", street_address: "", city: "", state: "", postal_code: "", complement: "" }); toast.success("Endereço salvo."); await qc.invalidateQueries({ queryKey: ["my-addresses"] }); }}><Input required value={form.label} onChange={update("label")} placeholder="Nome: Casa, Trabalho..." /><Input required value={form.recipient_name} onChange={update("recipient_name")} placeholder="Nome de quem recebe" /><Input required value={form.phone} onChange={update("phone")} placeholder="Telefone" /><Input required value={form.street_address} onChange={update("street_address")} placeholder="Rua, número e bairro" /><Input required value={form.city} onChange={update("city")} placeholder="Cidade" /><Input required maxLength={2} value={form.state} onChange={update("state")} placeholder="UF" /><Input value={form.postal_code} onChange={update("postal_code")} placeholder="CEP" /><Input value={form.complement} onChange={update("complement")} placeholder="Complemento" /><Button type="submit" className="sm:col-span-2"><Plus />Adicionar endereço</Button></form></section></main></div>;
}