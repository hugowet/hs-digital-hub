import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { beginPasskeyLogin, completePasskeyLogin } from "@/lib/webauthn.functions";
import { useServerFn } from "@tanstack/react-start";
import { Fingerprint } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const beginBiometric = useServerFn(beginPasskeyLogin);
  const completeBiometric = useServerFn(completePasskeyLogin);

  async function handleBiometric() {
    if (!window.PublicKeyCredential) {
      toast.error("Este aparelho não oferece entrada biométrica.");
      return;
    }
    setLoading(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const challenge = await beginBiometric();
      const response = await startAuthentication({
        optionsJSON: JSON.parse(challenge.optionsJSON),
      });
      const session = await completeBiometric({
        data: { challengeId: challenge.challengeId, response },
      });
      const { error } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
      if (error) throw error;
      navigate({ to: "/" });
    } catch (error) {
      toast.error(
        error instanceof Error && error.name !== "NotAllowedError"
          ? error.message
          : "Biometria cancelada ou não reconhecida.",
      );
    } finally {
      setLoading(false);
    }
  }

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
            data: { full_name: fullName.trim(), account_type: accountType },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirmation(true);
          toast.success("Conta criada! Confirme seu e-mail para entrar.");
          return;
        }
        toast.success("Conta criada com sucesso!");
        navigate({ to: accountType === "seller" ? "/vendedor" : "/" });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/" });
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
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <div className="surface-card p-6">
          <h1 className="font-display text-2xl font-bold">
            {mode === "signin" ? "Entrar na HS Digital" : "Criar conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compre, acompanhe pedidos e gerencie sua loja.
          </p>

          {awaitingConfirmation ? (
            <div className="mt-6 rounded-md border border-border bg-muted p-4 text-sm">
              Enviamos uma confirmação para <strong>{email.trim()}</strong>. Abra o link recebido e
              depois entre na sua conta.
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
                  <fieldset>
                    <legend className="text-sm font-medium">Quero usar a HS Digital como</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(
                        [
                          ["buyer", "Comprador"],
                          ["seller", "Vendedor"],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={`cursor-pointer rounded-md border p-3 text-center text-sm font-medium ${accountType === value ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                        >
                          <input
                            type="radio"
                            name="account-type"
                            value={value}
                            checked={accountType === value}
                            onChange={() => setAccountType(value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
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
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>
            </form>
          )}

          {!awaitingConfirmation && mode === "signin" && (
            <div className="mt-3 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void handleBiometric()}
                disabled={loading}
              >
                <Fingerprint className="h-4 w-4" /> Entrar com biometria
              </Button>
              <Button variant="outline" className="w-full" onClick={handleGoogle}>
                Continuar com Google
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Use a digital, Face ID ou PIN já protegido pelo seu aparelho.
              </p>
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
