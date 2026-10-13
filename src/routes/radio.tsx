import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  Play,
  Crown,
  Sparkles,
  ExternalLink,
  X,
  ShieldCheck,
  Music,
  Radio,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

// Artistas de Sertanejo sugeridos para seleção rápida em um clique
const SERTANEJO_SUGGESTIONS = [
  "Gusttavo Lima",
  "Luan Santana",
  "Bruno & Marrone",
  "Ana Castela",
  "Jorge & Mateus",
  "Henrique & Juliano",
  "Zé Neto & Cristiano",
  "Marília Mendonça",
];

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Rádio HS Digital 🎵 · Especial Sertanejo" },
      {
        name: "description",
        content: "Ouça o melhor do sertanejo ao vivo e busque seus artistas favoritos na Rádio HS Digital.",
      },
    ],
  }),
  component: RadioHSPage,
});

export function RadioHSPage() {
  const [searchInput, setSearchInput] = useState("");
  const [activeArtist, setActiveArtist] = useState("Gusttavo Lima");
  const [playCount, setPlayCount] = useState(0);
  const [showClubModal, setShowClubModal] = useState(false);
  const [pendingArtist, setPendingArtist] = useState<string | null>(null);

  // 1. Valida se o usuário tem a assinatura ativa do Clube HS
  const { data: userProfile } = useQuery({
    queryKey: ["radio-user-clube-status"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_clube_hs")
        .eq("id", authData.user.id)
        .maybeSingle();

      return profile;
    },
    staleTime: 1000 * 60 * 5,
  });

  const isVipClube = Boolean(userProfile?.is_clube_hs);

  // 2. Integração com a Media Session API (notificações no celular e tela de bloqueio)
  const updateMediaSession = (artistName: string) => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${artistName} 🎵`,
        artist: "Rádio HS Digital 🎵",
        album: "Especial Sertanejo",
        artwork: [
          {
            src: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&q=80",
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });
    } catch (e) {
      console.warn("MediaSession não suportada neste navegador:", e);
    }
  };

  useEffect(() => {
    updateMediaSession(activeArtist);
  }, [activeArtist]);

  // 3. Executa a busca e troca o artista tocado
  const executePlay = (artistName: string) => {
    const trimmed = artistName.trim();
    if (!trimmed) return;

    const nextCount = playCount + 1;
    setPlayCount(nextCount);

    // Usuário comum é interrompido pelo Pop-up do Clube HS a cada 3 músicas
    if (!isVipClube && nextCount % 3 === 0) {
      setPendingArtist(trimmed);
      setShowClubModal(true);
      return;
    }

    setActiveArtist(trimmed);
    updateMediaSession(trimmed);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      executePlay(searchInput);
    }
  };

  const handleSelectQuickArtist = (artist: string) => {
    setSearchInput(artist);
    executePlay(artist);
  };

  // URL limpa de busca e execução automática contínua via YouTube nocookie (zero erro de IP ou CORS)
  const iframeSrc = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(
    activeArtist + " sertanejo",
  )}&autoplay=1&playsinline=1&rel=0`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Topo do Player */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800/80">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
        </Link>

        <div className="flex items-center gap-2">
          {isVipClube ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5" /> Membro VIP Clube HS
            </div>
          ) : (
            <Link
              to="/clube-hs"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Ouvir sem Anúncios
            </Link>
          )}
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-3xl w-full mx-auto my-6 space-y-6">
        {/* Identificação da Estação */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Rádio HS Digital 🎵
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AO VIVO
                </span>
              </h1>
              <p className="text-xs text-slate-400">Tocando: <strong className="text-amber-400">{activeArtist}</strong></p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 hidden sm:block">
            <span>{isVipClube ? "Acesso VIP Ilimitado" : `Músicas tocadas: ${playCount}`}</span>
          </div>
        </div>

        {/* CAMPO DE BUSCA OBRIGATÓRIO COM ÍCONE DE LUPA */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Digite qualquer artista (ex: Gusttavo Lima, Luan Santana, Bruno & Marrone)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 h-11 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-xl text-sm focus-visible:ring-amber-500"
              />
            </div>
            <Button
              type="submit"
              className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shrink-0 shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" /> Tocar
            </Button>
          </form>

          {/* Seletores Rápidos de Artistas Sertanejos */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Music className="w-3 h-3" /> Sugestões:
            </span>
            {SERTANEJO_SUGGESTIONS.map((artist) => {
              const isSelected = activeArtist.toLowerCase() === artist.toLowerCase();
              return (
                <button
                  key={artist}
                  type="button"
                  onClick={() => handleSelectQuickArtist(artist)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm"
                      : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60"
                  }`}
                >
                  {artist}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTAINER LIMPO DO IFRAME DE ALTA FIDELIDADE */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl relative overflow-hidden">
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800">
            <iframe
              title={`Tocando ${activeArtist} na Rádio HS`}
              src={iframeSrc}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Executando áudio contínuo sem travamentos
            </span>
            <span className="text-slate-500 text-[11px]">Compatível com celular &amp; Wi-Fi</span>
          </div>
        </div>
      </main>

      {/* Rodapé da Página */}
      <footer className="max-w-3xl w-full mx-auto text-center text-xs text-slate-500 pt-4 border-t border-slate-900">
        Rádio HS Digital · Feita para os clientes do Marketplace HS.
      </footer>

      {/* POP-UP DO CLUBE HS A CADA 3 MÚSICAS */}
      {showClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative">
            <button
              onClick={() => {
                setShowClubModal(false);
                if (pendingArtist) {
                  setActiveArtist(pendingArtist);
                  updateMediaSession(pendingArtist);
                  setPendingArtist(null);
                }
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center mx-auto mb-4 font-bold shadow-lg shadow-amber-500/30">
              <Crown className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-white">Gostando do Sertanejo na HS?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Assine o <strong className="text-amber-400">Clube HS</strong> por apenas{" "}
              <strong>R$ 19,90/mês</strong> e curta suas músicas sem interrupções, além de{" "}
              <strong>Frete Grátis na região de Perdizes</strong> e ofertas exclusivas!
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/clube-hs"
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                Assinar Clube HS por R$ 19,90
                <ExternalLink className="w-4 h-4" />
              </Link>

              <Button
                variant="ghost"
                onClick={() => {
                  setShowClubModal(false);
                  if (pendingArtist) {
                    setActiveArtist(pendingArtist);
                    updateMediaSession(pendingArtist);
                    setPendingArtist(null);
                  }
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Continuar ouvindo gratuitamente
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Membros VIP do Clube HS têm player 100% liberado.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
