import { useLocation, Link } from "@tanstack/react-router";
import { Play, Pause, SkipForward, Radio, Volume2, VolumeX, X } from "lucide-react";
import { useRadio } from "@/lib/radio-context";
import { useState } from "react";

export function RadioMiniPlayer() {
  const location = useLocation();
  const { currentTrack, isPlaying, togglePlay, handleNextTrack, isMuted, setIsMuted } = useRadio();
  const [isDismissed, setIsDismissed] = useState(false);

  // Não exibe se o usuário estiver dentro da própria tela cheia da rádio
  if (location.pathname === "/radio" || location.pathname === "/radio-hs") {
    return null;
  }

  // Não exibe se nunca foi iniciado e o usuário fechou
  if (!isPlaying && isDismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Player de Rádio em Segundo Plano"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-slate-950/95 border border-blue-500/30 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white">
        <Link
          to="/radio"
          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 transition-opacity"
          title="Abrir Rádio em tela cheia"
        >
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-700/60 shadow-md">
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-slate-950" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <p className="text-xs font-bold truncate text-slate-100">{currentTrack.title}</p>
            </div>
            <p className="text-[11px] text-slate-400 truncate">{currentTrack.artist}</p>
          </div>
        </Link>

        {/* Controles Rápidos */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? "Desmutar" : "Mutar"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition-transform active:scale-95"
            title={isPlaying ? "Pausar" : "Tocar"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={handleNextTrack}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
            title="Próxima estação"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {!isPlaying && (
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-500 hover:text-slate-300 ml-1"
              title="Fechar mini player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
