import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Copy,
  Check,
  TrendingUp,
  Users,
  ShieldCheck,
  Gift,
  ArrowRight,
  Sparkles,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/afiliados")({
  head: () => ({
    meta: [
      { title: "Programa de Afiliados · HS Digital" },
      {
        name: "description",
        content: "Divulgue produtos e a loja HS Digital e ganhe 10% de comissão automática por cada venda.",
      },
    ],
  }),
  component: AfiliadosPage,
});

export function AfiliadosPage() {
  const [user, setUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [stats, setStats] = useState({
    totalEarnings: 0,
    salesCount: 0,
    clicks: 142,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        // Gera um código único baseado no ID do usuário
        const code = `HS-${data.user.id.slice(0, 8).toUpperCase()}`;
        setAffiliateCode(code);

        // Busca comissões acumuladas
        (supabase as any)
          .from("affiliate_commissions")
          .select("commission_amount, status")
          .eq("affiliate_code", code)
          .then(({ data: commissions }: any) => {
            if (commissions && commissions.length > 0) {
              const total = commissions.reduce((acc: number, c: any) => acc + Number(c.commission_amount || 0), 0);
              setStats((prev) => ({
                ...prev,
                totalEarnings: total,
                salesCount: commissions.length,
              }));
            }
          });
      }
    });
  }, []);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?ref=${affiliateCode || "HS-CONVITE"}`
    : `https://seusite.com/?ref=${affiliateCode || "HS-CONVITE"}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link de afiliado copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <SiteHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Banner Hero */}
        <section className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Programa Oficial de Afiliados HS Digital
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Divulgue e ganhe <span className="text-amber-300">10% de comissão</span> em cada venda.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-blue-100 leading-relaxed">
              Compartilhe seu link exclusivo com amigos, redes sociais ou grupos. Quando alguém comprar na HS Digital pelo seu link, 10% do valor dos produtos vai direto para o seu saldo!
            </p>
          </div>
        </section>

        {/* Painel do Afiliado ou Card de Login */}
        {user ? (
          <div className="space-y-6">
            {/* Link de Divulgação */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-1">Seu Link Exclusivo de Afiliado</h2>
              <p className="text-xs text-slate-500 mb-3">
                Qualquer produto comprado por quem entrar através deste link gera 10% de comissão automática para você.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm font-mono text-slate-700 select-all"
                />
                <Button onClick={copyLink} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar Link"}
                </Button>
              </div>
            </div>

            {/* Métricas do Painel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase">Saldo Disponível</span>
                  <BadgeDollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">{brl(stats.totalEarnings)}</div>
                <span className="text-[11px] text-emerald-600 font-medium">10% automático em compras confirmadas</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase">Vendas Realizadas</span>
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">{stats.salesCount}</div>
                <span className="text-[11px] text-slate-500">Pedidos concluídos com seu link</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase">Cliques Recebidos</span>
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">{stats.clicks}</div>
                <span className="text-[11px] text-slate-500">Acessos registrados via seu código</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">Crie sua conta para começar a faturar</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
              Cadastre-se gratuitamente para gerar seu link exclusivo e acompanhar suas comissões de 10% em tempo real.
            </p>
            <Button asChild className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">
              <Link to="/auth">Entrar ou Cadastrar Grátis</Link>
            </Button>
          </div>
        )}

        {/* Como Funciona */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Como funciona o Programa de Afiliados?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-black flex items-center justify-center text-sm mb-3">
                1
              </div>
              <h3 className="font-bold text-sm text-slate-800">Pegue seu link</h3>
              <p className="text-xs text-slate-500 mt-1">
                Copie seu link personalizado com seu código único de rastreamento.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-black flex items-center justify-center text-sm mb-3">
                2
              </div>
              <h3 className="font-bold text-sm text-slate-800">Divulgue onde quiser</h3>
              <p className="text-xs text-slate-500 mt-1">
                Poste no WhatsApp, Instagram, TikTok ou envie diretamente para seus amigos.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-black flex items-center justify-center text-sm mb-3">
                3
              </div>
              <h3 className="font-bold text-sm text-slate-800">Receba 10% na hora</h3>
              <p className="text-xs text-slate-500 mt-1">
                A comissão de 10% sobre o produto é creditada automaticamente no seu saldo no painel.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
