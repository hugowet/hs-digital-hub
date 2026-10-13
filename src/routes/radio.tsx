import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { Radio, Music, Volume2, Search, Play, Crown, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

// Função da Rádio Interativa da HS Digital
function RadioHSComponent() {
  // Começa tocando uma seleção de sertanejo famosa por padrão
  const [videoCode, setVideoCode] = useState("jfKfPfyJRdk"); 
  const [buscaMusica, setBuscaMusica] = useState("");
  const [musicaAtual, setMusicaAtual] = useState("Rádio HS Digital - Seleção Sertaneja");
  
  // Controle de assinantes e anúncios do seu marketplace
  const [isClubeMember, setIsClubeMember] = useState(false);
  const [contadorMusicas, setContadorMusicas] = useState(0);
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

  // 2. Função inteligente de busca que aceita qualquer artista ou música
  const lidarComBusca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buscaMusica.trim()) return;

    // Se NÃO for do clube, conta até dar o gatilho de 3 músicas
    if (!isClubeMember) {
      const proximoNumero = contadorMusicas + 1;
      if (proximoNumero >= 3) {
        setMostrarAnuncio(true);
        setContadorMusicas(0); // Reseta para contar mais 3 depois
        return; // Bloqueia a música até fechar o anúncio do Clube HS
      } else {
        setContadorMusicas(proximoNumero);
      }
    }

    // Altera o player para tocar exatamente o cantor que o cliente digitou!
    const termoFormatado = encodeURIComponent(buscaMusica.trim());
    setVideoCode(`videoseries?list=search&keyword=${termoFormatado}`);
    setMusicaAtual(buscaMusica.trim());
    setBuscaMusica("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <SiteHeader />
      
      <main className="max-w-xl w-full mx-auto my-auto p-4 py-8">
        {/* CABEÇALHO DO PLAYER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide">HS DIGITAL STREAM</h1>
              <p className="text-[11px] text-slate-400">Áudio em Segundo Plano Ativo</p>
            </div>
          </div>

          {isClubeMember ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5 fill-amber-300" />
              Membro VIP Clube HS
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Modo com Anúncios ({contadorMusicas}/3)
            </div>
          )}
        </div>

        {/* CARD CENTRAL DO PLAYER */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
          
          {/* BARRA DE PESQUISA REAL DE ARTISTAS */}
          <form onSubmit={lidarComBusca} className="relative flex items-center w-full">
            <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={buscaMusica}
              onChange={(e) => setBuscaMusica(e.target.value)}
              placeholder="Digite o Cantor ou Música... (Ex: Gusttavo Lima)"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-24 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 h-8 bg-amber-500 text-white font-bold px-3 rounded-lg text-xs hover:bg-amber-600 transition-colors"
            >
              🔍 Buscar
            </button>
          </form>

          {/* SINALIZADOR DE MÚSICA ATUAL */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-amber-500 shrink-0 animate-bounce" /> 
              <p className="text-xs font-semibold truncate text-slate-400">
                Ouvindo agora: <span className="text-white font-bold uppercase">{musicaAtual}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full shrink-0">
              <Volume2 className="h-3.5 w-3.5" /> Som HD
            </div>
          </div>

          {/* INTERFACE DO PLAYER DE VÍDEO / ÁUDIO CONTÍNUO */}
          <div className="rounded-2xl overflow-hidden bg-black aspect-video shadow-inner border border-slate-800">
            <iframe
              src={`https://youtube.com{videoCode}&autoplay=1`}
              width="100%"
              height="100%"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen={true}
              loading="lazy"
              className="border-0"
            />
          </div>

          {/* GATILHO PUBLICITÁRIO DO CLUBE */}
          <div className="bg-gradient-to-r from-amber-500/10 to-blue-500/10 border border-slate-800 p-4 rounded-xl text-center space-y-1">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <Crown className="h-3.5 w-3.5 fill-current" /> Benefício Clube HS Perdizes
            </p>
            <p className="text-xs text-slate-400 leading-normal">
              Assinantes do clube removem os anúncios do player e desbloqueiam entregas com frete grátis na região!
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
              <p className="text-xs text-slate-400">O seu sertanejo continuará tocando assim que você fechar o banner.</p>
            </div>

            {/* BANNER DE ANÚNCIO */}
            <div className="w-full h-40 bg-slate-950 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-4">
              <p className="text-xs text-slate-500 font-mono">[ Espaço do Google AdSense ]</p>
              <p className="text-[11px] text-amber-400 font-bold mt-2">hs-digital-marck.lovable.app</p>
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

// DECLARAÇÃO DA ROTA OFICIAL DO TANSTACK
export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Rádio HS Digital 🎵 · Ao Vivo" },
      {
        name: "description",
        content: "Ouça a programação de sertanejo oficial da HS Digital com reprodução contínua e busca de artistas.",
      },
    ],
  }),
  component: RadioHSComponent,
});
