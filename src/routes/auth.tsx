import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { reason?: "login-required"; redirect?: string } => ({
    ...(search["reason"] === "login-required" ? { reason: "login-required" } : {}),
    ...(typeof search["redirect"] === "string" && search["redirect"] ? { redirect: search["redirect"] } : {}),
  }),
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Entrar · HS Digital" },
      { name: "description", content: "Acesse sua conta HS Digital para comprar ou vender." },
      { property: "og:title", content: "Entrar · HS Digital" },
      {
        property: "og:description",
        content: "Acesse sua conta HS Digital para comprar ou vender.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { reason, redirect: redirectUrl } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  useEffect(() => {
    if (reason === "login-required") {
      toast.info("Faça login primeiro para acessar esta área.");
    }
  }, [reason]);

  // Already signed in (e.g. user pressed Back after logging in): leave the login screen.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: (redirectUrl as any) || "/", replace: true });
    });
  }, [navigate, redirectUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim(), account_type: "buyer" },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirmation(true);
          toast.success("Conta criada! Confirme seu e-mail para entrar.");
          return;
        }
        toast.success("Conta criada com sucesso!");
        navigate({ to: (redirectUrl as any) || "/", replace: true });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      }
      navigate({ to: (redirectUrl as any) || "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: (redirectUrl as any) || "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <div className="surface-card p-6">
          <h1 className="font-display text-2xl font-bold">
            {mode === "signin" ? "Entrar na HS Digital" : "Criar conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Compre, acompanhe pedidos e gerencie sua loja.</p>

          {reason === "login-required" && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm font-medium text-foreground"
            >
              Faça login primeiro para acessar esta área.
            </div>
          )}

          {awaitingConfirmation ? (
            <div className="mt-6 rounded-md border border-border bg-muted p-4 text-sm">
              Enviamos uma confirmação para <strong>{email.trim()}</strong>. Abra o link recebido e depois entre na sua
              conta.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="full-name">Nome completo</Label>
                    <Input
                      id="full-name"
                      required
                      minLength={2}
                      maxLength={100}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>
            </form>
          )}

          {!awaitingConfirmation && mode === "signin" && (
            <div className="mt-3 space-y-2">
              <Button variant="outline" className="w-full" onClick={handleGoogle}>
                Continuar com Google
              </Button>
            </div>
          )}

          <button
            className="mt-4 w-full text-sm text-primary hover:underline"
            onClick={() => {
              setAwaitingConfirmation(false);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tenho conta"}
          </button>
        </div>
      </main>
    </div>
  );
}
