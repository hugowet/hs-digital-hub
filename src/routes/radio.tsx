import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { Radio, Music, Volume2, Crown, Sparkles, Megaphone, Play } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

// BANCO DE ESTAÇÕES OFICIAIS E PARCEIRAS (LIBERADAS PARA CELULAR)
const ESTACOES_SERTANEJAS = [
  {
    id: "sertanejo-topo",
    nome: "Sertanejo Universitário 2026",
    descricao: "Os maiores sucessos do momento",
    embedUrl: "https://spotify.com"
  },
  {
    id: "modao-raiz",
    nome: "Modão Sertanejo Raiz",
    descricao: "Clássicos e os melhores modões",
    embedUrl: "https://spotify.com"
  },
  {
    id: "pisadinha-peseiro",
    nome: "Piseiro & Pisadinha",
    descricao: "Ritmo acelerado para agitar o dia",
    embedUrl: "https://spotify.com"
  },
  {
    id: "churrasco-sertanejo",
    nome: "Esquenta & Churrasco",
    descricao: "Músicas para curtir com a galera",
    embedUrl: "https://spotify.com"
  }
];

function RadioHSComponent() {
  const [estacaoAtual, setEstacaoAtual] = useState(ESTACOES_SERTANEJAS[0]);
  const [isClubeMember, setIsClubeMember] = useState(false);
  const [contadorTrocas, setContadorTrocas] = useState(0);
  const [mostrarAnuncio, setMostrarAnuncio] = useState(false);

  // 1. Verifica se o usuário logado é membro ativo do Clube HS
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_clube_hs")
          .eq("id", data.user.id)
          .maybeSingle();
        
        if (profile) {
          setIsClubeMember(Boolean(profile.is_clube_hs));
        }
      }
    });
  }, []);

  // 2. Troca de estação controlando o gatilho de anúncios
  const trocarEstacao = (novaEstacao: typeof ESTACOES_SERTANEJAS[0]) => {
    if (novaEstacao.id === estacaoAtual.id) return;

    if (!isClubeMember) {
      const proximoNumero = contadorTrocas + 1;
      if (proximoNumero >= 3) {
        setMostrarAnuncio(true);
        setContadorTrocas(0);
        return; // Trava a troca até ele visualizar a oferta do Clube HS
      } else {
        setContadorTrocas(proximoNumero);
      }
    }

    setEstacaoAtual(novaEstacao);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <SiteHeader />
      
      <main className="max-w-xl w-full mx-auto my-auto p-4 py-8 space-y-6">
        {/* CABEÇALHO DO PLAYER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide">RÁDIO HS DIGITAL</h1>
              <p className="text-[11px] text-slate-400">Streaming Contínuo Ativo</p>
            </div>
          </div>

          {isClubeMember ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5 fill-amber-300" />
              Membro VIP
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Modo Livre ({contadorTrocas}/3)
            </div>
          )}
        </div>

        {/* INTERFACE DO PLAYER COMPLETO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
          
          {/* SINALIZADOR DA SELEÇÃO ATUAL */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-amber-500 shrink-0 animate-bounce" /> 
              <p className="text-xs font-semibold truncate text-slate-400">
                Estilo atual: <span className="text-white font-bold uppercase">{estacaoAtual.nome}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
              <Volume2 className="h-3.5 w-3.5" /> Áudio Digital
            </div>
          </div>

          {/* PLAYER EMBED OFICIAL INTEGRADO (SEM ERRO DE IP) */}
          <div className="rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800 h-[350px]">
            <iframe
              src={estacaoAtual.embedUrl}
              width="100%"
              height="100%"
              allowFullScreen={true}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="border-0"
            />
          </div>

          {/* BOTÕES DE SELEÇÃO RÁPIDA DE CANTORES / ESTILOS */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mudar de Programação:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ESTACOES_SERTANEJAS.map((estacao) => (
                <button
                  key={estacao.id}
                  onClick={() => trocarEstacao(estacao)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    estacao.id === estacaoAtual.id
                      ? "border-amber-500 bg-amber-500/10 text-white font-bold"
                      : "border-slate-800 bg-slate-950/50 hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs truncate">{estacao.nome}</p>
                    <p className="text-[10px] text-slate-500 truncate">{estacao.descricao}</p>
                  </div>
                  <Play className={`w-3.5 h-3.5 shrink-0 ml-2 ${estacao.id === estacaoAtual.id ? "text-amber-500 fill-amber-500" : "text-slate-500"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* GATILHO PUBLICITÁRIO DO CLUBE */}
          <div className="bg-gradient-to-r from-amber-500/10 to-blue-500/10 border border-slate-800 p-4 rounded-xl text-center space-y-1">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <Crown className="h-3.5 w-3.5 fill-current" /> Benefício Clube HS Perdizes
            </p>
            <p className="text-xs text-slate-400 leading-normal">
              Membros VIP ouvem as estações de forma contínua e sem nenhuma propaganda na transição.
            </p>
          </div>
        </div>
      </main>

      {/* POP-UP DE BLOQUEIO POR ANÚNCIO (MONETIZAÇÃO) */}
      {mostrarAnuncio && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Anúncio do Patrocinador</h3>
              <p className="text-xs text-slate-400">A sua programação continuará tocando assim que fechar o banner publicitário.</p>
            </div>

            {/* BANNER DE ANÚNCIO */}
            <div className="w-full h-40 bg-slate-950 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-4">
              <div className="mx-auto w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-amber-500 mb-2">
                <Megaphone className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500 font-mono">[ Espaço do Google AdSense ]</p>
              <p className="text-[11px] text-amber-400 font-bold mt-1">hs-digital-marck.lovable.app</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-left">
              <p className="text-xs font-bold text-amber-400 flex items-center gap-1 uppercase">
                <Crown className="h-3.5 w-3.5 fill-current" /> Sem interrupções?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Assine o <strong>Clube HS</strong> por R\$ 19,90/mês e escute suas músicas direto e sem nenhum anúncio!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setMostrarAnuncio(false)}
                className="border border-slate-700 text-white hover:bg-slate-800 font-semibold py-2 rounded-xl text-xs transition-colors"
              >
                Fechar Anúncio
              </button>
              <a
                href="/clube-hs"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
              >
                <Crown className="h-3.5 w-3.5 fill-white" /> Ser VIP
              </a>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
