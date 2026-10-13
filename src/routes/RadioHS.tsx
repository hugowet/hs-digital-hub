import React, { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";

// Lista de estações de streaming de áudio real ao vivo (.mp3) estáveis e compatíveis
const TRACKS = [
  {
    title: "Sertanejo Universitário & Modão",
    artist: "Rádio HS Sertaneja 🤠",
    album: "As Melhores de Gusttavo Lima, Luan Santana e mais",
    artwork: "https://unsplash.com",
    src: "https://brlogic.com", // Stream de áudio sertanejo real e ativo
  },
  {
    title: "HS Hits, Pop & Top Brasil",
    artist: "Rádio HS Digital 🎵",
    album: "Sucessos Nacionais",
    artwork: "https://unsplash.com",
    src: "https://zeno.fm", // Stream de áudio Pop comercial estável
  },
  {
    title: "Lo-Fi Lounge & Relax",
    artist: "Rádio HS Chill ☕",
    album: "Foco e Estudo",
    artwork: "https://unsplash.com",
    src: "https://zeno.fm", // Stream Lo-Fi permanente
  }
];

export function RadioHS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [songSwitchCount, setSongSwitchCount] = useState(0);
  const [showClubModal, setShowClubModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentTrack = TRACKS[currentTrackIndex];

  // 1. Verifica autenticação e status do Clube HS no Supabase
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

  // 2. Configuração da Media Session API para controle em segundo plano e fone bluetooth
  const updateMediaSession = (track: typeof TRACKS[0]) => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${track.title} 🎵`,
      artist: track.artist,
      album: track.album || "Marketplace HS Digital",
      artwork: [{ src: track.artwork, sizes: "512x512", type: "image/jpeg" }],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play();
      setIsPlaying(true);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      handlePrevTrack();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      handleNextTrack();
    });
  };

  // 3. Atualiza fonte e reproduz o áudio quando a estação muda
  useEffect(() => {
    if (!audioRef.current) return;

    setIsLoading(true);
    audioRef.current.src = currentTrack.src;
    audioRef.current.load();
    updateMediaSession(currentTrack);

    if (isPlaying) {
      audioRef.current.play()
        .then(() => setIsLoading(false))
        .catch((err) => {
          console.warn("Autoplay bloqueado pelo navegador:", err);
          setIsPlaying(false);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [currentTrackIndex]);

  // 4. Controle de volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // 5. Alterna Play / Pause de forma segura
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    } else {
      setIsLoading(true);
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
          updateMediaSession(currentTrack);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        })
        .catch((err) => {
          setIsLoading(false);
          console.error("Falha ao reproduzir áudio:", err);
        });
    }
  };

  const handleNextTrack = () => {
    const nextCount = songSwitchCount + 1;
    setSongSwitchCount(nextCount);

    if (!isVipClube && nextCount % 3 === 0) {
      setShowClubModal(true);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Elemento de áudio HTML5 puro para áudio contínuo sem vídeo */}
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        onPlay={() => {
          setIsPlaying(true);
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
        }}
        onPause={() => {
          setIsPlaying(false);
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        }}
      />

      {/* Header do Player */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">RÁDIO HS DIGITAL</h1>
            <p className="text-[11px] text-slate-400">Som de Alta Fidelidade (Somente Áudio)</p>
          </div>
        </div>

        {isVipClube ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
            <Crown className="w-3.5 h-3.5" />
            Membro VIP Clube HS
          </div>
        ) : (
          <Link
            to="/clube-hs"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Ouvir sem Anúncios
          </Link>
        )}
      </header>

      {/* Card Central do Player */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          
          {/* Capa Estilizada */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-6 shadow-xl border border-slate-700/50 bg-slate-950 flex items-center justify-center">
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? "scale-105" : "scale-100"}`}
            />
            {isPlaying && (
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                AO VIVO
              </div>
            )}
          </div>

          {/* Info da Estação Tocando */}
          <div className="text-center mb-6">
            <span className="text-[10px] font-black tracking-widest uppercase bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/20">
              Estação Selecionada
            </span>
            <h2 className="text-xl font-extrabold tracking-tight truncate mt-3">{currentTrack.title}</h2>
            <p className="text-sm font-medium text-slate-400 mt-1">{currentTrack.artist}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{currentTrack.album}</p>
          </div>

          {/* Controles Principais */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={handlePrevTrack}
              className="p-3 text-slate-400 hover:text-white transition-colors active:scale-90"
              title="Estação Anterior"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 transition-transform active:scale-95 disabled:opacity-50"
              title={isPlaying ? "Pausar" : "Tocar"}
            >
              {isLoading ? (
) : isPlaying ? (

) : (

)}
{/* Controle de Volume */}

<button
onClick={() => setIsMuted(!isMuted)}
className="text-slate-400 hover:text-white transition-colors"
>
{isMuted || volume === 0 ? (

) : (

)}

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


{/* Footer Info */}

Rádio HS Digital · Compatível com reprodução em segundo plano e tela bloqueada do celular.
{/* Pop-up do Clube HS */}
{showClubModal && (


<button
onClick={() => {
setShowClubModal(false);
togglePlay();
}}
className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full"
>

Gostando da Rádio HS?

Assine o Clube HS por apenas{" "}
R$ 19,90/mês e ouça suas estações favoritas sem nenhuma interrupção, com Frete Grátis e cupons de desconto!
Assinar Clube HS por R$ 19,90
<Button
variant="ghost"
onClick={() => {
setShowClubModal(false);
togglePlay();
}}
className="text-xs text-slate-400 hover:text-white"
>
Continuar ouvindo gratuitamente

Membros do clube têm acesso 100% livre.



)}

);
}
