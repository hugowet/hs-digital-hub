import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Criar nova senha | HS Digital" },
      { name: "description", content: "Defina uma nova senha para sua conta HS Digital." },
      { property: "og:title", content: "Criar nova senha | HS Digital" },
      { property: "og:description", content: "Defina uma nova senha para sua conta HS Digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não são iguais.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error("Link expirado ou inválido. Peça um novo em Esqueci a senha.");
    toast.success("Senha alterada com sucesso!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Criar nova senha</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="np">Nova senha</Label>
            <Input id="np" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cp">Repita a nova senha</Label>
            <Input id="cp" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>Salvar nova senha</Button>
        </form>
      </main>
    </div>
  );
}
