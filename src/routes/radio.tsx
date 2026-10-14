import { createFileRoute } from "@tanstack/react-router";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  Crown,
  Sparkles,
  ExternalLink,
  X,
  ShieldCheck,
  Mic,
  Volume1,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useRadio } from "@/lib/radio-context";

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Rádio HS Digital 🎵 · Ao Vivo com Locutor Virtual" },
      {
        name: "description",
        content: "Programação exclusiva HS Digital com Locutor Virtual, anúncios e ofertas com reprodução contínua.",
      },
    ],
  }),
  component: RadioHSPage,
});

export function RadioHSPage() {
  const {
    tracks,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    isVipClube,
    showClubModal,
    isLocutorSpeaking,
    currentAnnouncement,
    announcements,
    locutorEnabled,
    setShowClubModal,
    setLocutorEnabled,
    togglePlay,
    handleNextTrack,
    handlePrevTrack,
    selectTrack,
    setVolume,
    setIsMuted,
    speakAnnouncementNow,
  } = useRadio();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Header do Player */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors ${
              isPlaying ? "bg-emerald-600 shadow-emerald-500/30" : "bg-blue-600 shadow-blue-500/30"
            }`}>
              <Radio className={`w-5 h-5 ${isPlaying ? "animate-pulse" : ""}`} />
            </div>
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
              </span>
            )}
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
              HS DIGITAL STREAM
              {isPlaying && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  NO AR
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400">Locutor Virtual Ativo em Segundo Plano</p>
          </div>
        </div>

        {isVipClube ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
            <Crown className="w-3.5 h-3.5" />
            Membro VIP Clube HS
          </div>
        ) : (
          <a
            href="/clube-hs"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Clube HS VIP
          </a>
        )}
      </header>

      {/* Card Central */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Status do Locutor Virtual */}
          <div className={`mb-4 px-3.5 py-2.5 rounded-2xl border transition-all ${
            isLocutorSpeaking
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-slate-800/60 border-slate-700/60 text-slate-300"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className={`w-4 h-4 ${isLocutorSpeaking ? "animate-bounce text-emerald-400" : "text-slate-400"}`} />
                <span className="text-xs font-bold">
                  {isLocutorSpeaking ? "Locutor no microfone agora:" : "Locutor Virtual HS"}
                </span>
              </div>
              <button
                onClick={() => speakAnnouncementNow()}
                disabled={!isPlaying}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
              >
                Ouvir anúncio agora
              </button>
            </div>

            {isLocutorSpeaking && currentAnnouncement && (
              <p className="text-xs text-emerald-200/90 mt-1.5 italic bg-black/30 p-2 rounded-lg leading-relaxed">
                "{currentAnnouncement.script}"
              </p>
            )}
          </div>

          {/* Capa com Glow */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-6 shadow-xl border border-slate-700/50">
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {isPlaying && (
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                AO VIVO
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold tracking-tight truncate">{currentTrack.title}</h2>
            <p className="text-sm font-medium text-slate-400 mt-1">{currentTrack.artist}</p>
            <p className="text-xs text-slate-500">{currentTrack.album}</p>
          </div>

          {/* Controles Principais */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={handlePrevTrack}
              className="p-3 text-slate-400 hover:text-white transition-colors"
              title="Trilha anterior"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              onClick={togglePlay}
              className={`w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                isPlaying 
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30" 
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
              }`}
              title={isPlaying ? "Pausar" : "Tocar"}
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </button>

            <button
              onClick={handleNextTrack}
              className="p-3 text-slate-400 hover:text-white transition-colors"
              title="Próxima trilha"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-800/80 px-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-red-400" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={(vals) => {
                setIsMuted(false);
                setVolume(vals[0] / 100);
              }}
              className="flex-1"
            />
          </div>

          {/* Anúncios de Marketing Programados */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Roteiro de Anúncios da Rádio
              </span>
              <button
                onClick={() => setLocutorEnabled(!locutorEnabled)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  locutorEnabled
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                {locutorEnabled ? "Locutor Ligado" : "Locutor Mudo"}
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {announcements.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => speakAnnouncementNow(idx)}
                  className="w-full text-left p-2 rounded-xl text-xs bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors flex items-center justify-between group"
                >
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-amber-400 block font-bold uppercase">{item.tag}</span>
                    <span className="text-slate-200 group-hover:text-white font-medium">{item.title}</span>
                  </div>
                  <Volume1 className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-xl w-full mx-auto text-center text-xs text-slate-500">
        Áudio contínuo em segundo plano ativo enquanto você navega na vitrine.
      </footer>

      {/* Modal Clube HS */}
      {showClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative">
            <button
              onClick={() => {
                setShowClubModal(false);
                togglePlay();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center mx-auto mb-4 font-bold shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white">Gostando da Rádio HS?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Assine o <strong className="text-amber-400">Clube HS</strong> por apenas{" "}
              <strong>R$ 19,90/mês</strong> e ouça sem anúncios, além de Frete Grátis na região de
              Perdizes!
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href="/clube-hs"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
              >
                Assinar Clube HS por R$ 19,90
                <ExternalLink className="w-4 h-4" />
              </a>

              <Button
                variant="ghost"
                onClick={() => {
                  setShowClubModal(false);
                  togglePlay();
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Continuar ouvindo
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Membros do clube têm player 100% liberado.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
