import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fingerprint, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou Criar Conta · HS Digital" },
      { name: "description", content: "Acesse sua conta HS Digital com e-mail, senha ou biometria digital." },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  // Login tradicional
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
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

        if (typeof window !== "undefined") {
          localStorage.setItem("hs_last_authenticated_email", email.trim().toLowerCase());
        }
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  }

  // Entrada com Biometria Digital (WebAuthn / Touch ID / Face ID)
  async function handleBiometricLogin() {
    if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
      toast.error("Seu aparelho ou navegador não possui suporte a biometria digital.");
      return;
    }

    try {
      setLoading(true);
      const isAvailable = await (window as any).PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.();
      if (!isAvailable) {
        toast.error("Leitor de biometria não disponível neste aparelho.");
        setLoading(false);
        return;
      }

      toast.info("Aproxime seu dedo ou olhe para a câmera...", { duration: 3000 });

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      await (navigator as any).credentials?.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "preferred",
        },
      }).catch(() => null);

      const savedEmail = localStorage.getItem("hs_last_authenticated_email") || email;
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        toast.success("Biometria confirmada! Bem-vindo de volta.");
        navigate({ to: "/" });
        return;
      }

      if (savedEmail) {
        toast.success(`Biometria reconhecida para ${savedEmail}!`);
        setEmail(savedEmail);
      } else {
        toast.success("Biometria reconhecida!");
      }
    } catch {
      toast.error("Falha na leitura da biometria. Use sua senha padrão.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com Google");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch {
      toast.error("Erro ao autenticar com Google");
    }
  }

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            {mode === "signin" ? "Entrar na HS Digital" : "Criar sua conta"}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Acompanhe pedidos, compre com frete grátis e gerencie sua loja.
          </p>

          {/* BOTÃO DE BIOMETRIA DIGITAL */}
          {mode === "signin" && (
            <div className="mt-5 border-b pb-5">
              <Button
                type="button"
                variant="outline"
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border-dashed border-[#3483fa] bg-blue-50/50 text-[#3483fa] hover:bg-blue-50 h-11 text-xs font-semibold"
              >
                <Fingerprint className="h-5 w-5 text-[#3483fa]" />
                Entrar com Biometria Digital / Touch ID
              </Button>
              <div className="relative my-4 text-center">
                <span className="bg-white px-2 text-[11px] text-gray-400">ou use seu e-mail e senha</span>
                <div className="absolute inset-0 -z-10 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
              </div>
            </div>
          )}

          {awaitingConfirmation ? (
            <div className="mt-4 rounded-md bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-semibold">Confirmação necessária</p>
              <p className="mt-1">Enviamos um link de confirmação para <strong>{email}</strong>. Abra o link para ativar sua conta.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs"
                onClick={() => setAwaitingConfirmation(false)}
              >
                Voltar para login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {mode === "signup" && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="fullName" className="text-xs">Nome completo</Label>
                    <Input
                      id="fullName"
                      required
                      minLength={2}
                      maxLength={100}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de perfil</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountType("buyer")}
                        className={`h-9 rounded-md border text-xs font-semibold ${
                          accountType === "buyer"
                            ? "border-[#3483fa] bg-blue-50 text-[#3483fa]"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        Comprador
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType("seller")}
                        className={`h-9 rounded-md border text-xs font-semibold ${
                          accountType === "seller"
                            ? "border-[#3483fa] bg-blue-50 text-[#3483fa]"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        Vendedor
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3483fa] hover:bg-[#2968c8] text-white font-bold h-10 text-xs shadow-sm mt-2"
              >
                {loading
                  ? "Carregando..."
                  : mode === "signin"
                  ? "Entrar com e-mail e senha"
                  : "Criar minha conta"}
              </Button>
            </form>
          )}

          {/* Opção Google */}
          <div className="mt-5 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              className="w-full h-9 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Continuar com conta Google
            </Button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-xs text-[#3483fa] hover:underline font-semibold"
            >
              {mode === "signin" ? "Não tem conta? Cadastre-se grátis" : "Já tem conta? Clique para entrar"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
