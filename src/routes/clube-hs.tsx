// @ts-nocheck -- types out of sync with backend schema; see build log
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Truck,
  Crown,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Loader2,
  TicketPercent,
  Radio,
  Play,
  PackageCheck,
  Headset,
  BadgeCheck,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createClubeHsSubscription, createClubeHsPix } from "@/lib/clube-hs.functions";

export const Route = createFileRoute("/clube-hs")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Clube HS · Assinatura de Fidelidade & Frete Grátis" },
      {
        name: "description",
        content: "Assine o Clube HS por R$ 19,90/mês e tenha rádio sem chamadas promocionais da HS Digital. Consulte as condições de frete e os benefícios disponíveis.",
      },
      { property: "og:title", content: "Clube HS · Assinatura de Fidelidade & Frete Grátis" },
      { property: "og:description", content: "Assine o Clube HS por R$ 19,90/mês e tenha rádio sem chamadas promocionais da HS Digital. Consulte as condições de frete e os benefícios disponíveis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClubeHsPage,
});

export function ClubeHsPage() {
  const [loading, setLoading] = useState(false);
  const subscribeFn = useServerFn(createClubeHsSubscription);
  const pixFn = useServerFn(createClubeHsPix);

  // Busca dados do usuário autenticado para checar status
  const { data: sessionData } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["user-clube-status", sessionData?.id],
    enabled: !!sessionData?.id,
    queryFn: async () => {
      if (!sessionData) return null;
      const { data, error } = await supabase.rpc("club_has_access", { _user_id: sessionData.id });
      if (error) throw error;
      const admin = await supabase.rpc("has_role", { _user_id: sessionData.id, _role: "admin" });
      if (admin.error) throw admin.error;
      return { is_clube_hs: data, is_admin: admin.data };
    },
  });

  const isMember = Boolean(profile?.is_clube_hs);

  async function handleSubscribe(pix = false) {
    if (!sessionData) {
      toast.info("Faça login na sua conta para assinar o Clube HS.");
      window.location.href = `/auth?redirect=${encodeURIComponent("/clube-hs")}`;
      return;
    }

    try {
      setLoading(true);
      const res = await (pix ? pixFn : subscribeFn)({ data: { origin: window.location.origin } });
      if (res.initPoint) {
        window.location.href = res.initPoint;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar assinatura. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900">
      <SiteHeader />

      {/* Top Banner Mercado Livre Style */}
      <section className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Crown className="w-3.5 h-3.5" /> Clube HS Digital
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Sua música merece o <span className="text-amber-400">Clube HS</span>
            </h1>
            <p className="text-slate-200 text-base sm:text-lg">
              Curta a Rádio HS sem interrupções promocionais da nossa loja. Seja membro por R$ 19,90/mês, sem fidelidade.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center min-w-[260px]">
            <p className="text-xs uppercase font-medium text-slate-300">Apenas</p>
            <div className="flex items-baseline justify-center gap-1 my-1">
              <span className="text-2xl font-bold">R$</span>
              <span className="text-5xl font-black text-amber-400">19</span>
              <span className="text-2xl font-bold">,90</span>
              <span className="text-xs text-slate-300">/mês</span>
            </div>
            <p className="text-[11px] text-slate-200 mt-1">Cancele quando quiser no Mercado Pago</p>
          </div>
        </div>
      </section>

      {/* Main Content & Benefits Card */}
      <main className="max-w-4xl mx-auto px-4 py-10 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-10">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Mais música. Menos interrupções.
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Deixe as chamadas da nossa loja de fora e aproveite sua programação favorita com o Clube HS.
            </p>
          </div>

          {/* Grid de Benefícios */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex flex-col items-center text-center p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Frete grátis para assinantes</h3>
              <p className="text-xs text-slate-500 mt-2">
                Assinante tem frete grátis nas compras, sem se preocupar com valor mínimo.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <TicketPercent className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Cupons de frete sem pressa</h3>
              <p className="text-xs text-slate-500 mt-2">
                Os cupons de frete ganhos nos jogos não somem em 24 horas. Vale um cupom por compra.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Rádio HS sem anúncios</h3>
              <p className="text-xs text-slate-500 mt-2">
                Ouça a Rádio HS sem as chamadas promocionais da loja enquanto sua assinatura estiver ativa.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center mb-4">
                <Play className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">HSTrends ilimitado</h3>
              <p className="text-xs text-slate-500 mt-2">
                Acesso ilimitado na HSTrends: assista, curta, comente e publique seus próprios vídeos.
              </p>
            </div>
          </div>

          {/* Lista de destaques */}
          <div className="mt-8 pt-8 border-t border-slate-100 space-y-3">
            {[
              { icon: PackageCheck, text: "Preferência no envio dos seus pedidos" },
              { icon: Headset, text: "Suporte premium com atendimento prioritário" },
              { icon: BadgeCheck, text: "Selo de verificado no seu perfil HS" },
              { icon: CheckCircle2, text: "Assinatura mensal sem fidelidade, com cobrança segura via Mercado Pago" },
              { icon: CheckCircle2, text: "E muito mais benefícios exclusivos chegando para os assinantes" },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Botão de Ação */}
          <div className="mt-10 flex flex-col items-center">
            {isMember ? (
              <div className="w-full sm:w-auto px-6 py-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center flex items-center justify-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {profile?.is_admin ? "Administrador · acesso premium gratuito permanente" : "Você já é membro ativo do Clube HS!"}
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-3">
              <Button
                onClick={() => handleSubscribe()}
                disabled={loading}
                className="w-full sm:w-auto min-w-[280px] h-14 text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Abrindo Mercado Pago...
                  </>
                ) : (
                  <>
                    Quero ser Clube HS · R$ 19,90/mês
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full sm:w-auto min-w-[280px] h-12" disabled={loading} onClick={() => handleSubscribe(true)}>
                <QrCode className="mr-2 h-5 w-5" /> Pagar 1 mês com Pix · R$ 19,90
              </Button>
              <p className="text-xs text-muted-foreground">Pix sem renovação automática. Acesso liberado após confirmação do pagamento.</p>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Checkout de assinatura transparente processado com segurança pelo Mercado Pago
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
