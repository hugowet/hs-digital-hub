import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, UserRound } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
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
  const { data: profile } = useQuery({ queryKey: ["my-profile", user.id], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("full_name,phone,account_type").eq("id", user.id).maybeSingle(); if (error) throw error; return data; } });
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto w-full max-w-2xl px-4 py-8"><h1 className="text-2xl font-bold">Minha conta</h1><section className="surface-card mt-6 p-5"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><UserRound /></span><div><p className="font-semibold">{profile?.full_name ?? "Cliente HS Digital"}</p><p className="text-sm text-muted-foreground">{profile?.account_type === "seller" ? "Vendedor" : "Comprador"}</p></div></div><div className="mt-5 border-t border-border pt-4"><p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{user.email}</p>{profile?.phone && <p className="mt-2 text-sm text-muted-foreground">Telefone: {profile.phone}</p>}</div></section></main></div>;
}
