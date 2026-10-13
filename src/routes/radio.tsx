import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";

interface Track {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  src: string;
}

const BACKUP_TRACKS: Track[] = [
  {
    title: "Antena 1 FM",
    artist: "Rádio Ao Vivo 🎵",
    album: "Sucessos Internacionais e Nacionais",
    artwork: "https://unsplash.com",
    src: "https://antena1.com.br",
  },
  {
    title: "Jovem Pan FM",
    artist: "Rádio Ao Vivo 🎵",
    album: "Pop, Rock e Notícias",
    artwork: "https://unsplash.com",
    src: "https://ciclano.io",
  },
  {
    title: "Alpha FM",
    artist: "Rádio Ao Vivo 🎵",
    album: "Música Leve e Hits",
    artwork: "https://unsplash.com",
    src: "https://fabricahost.com.br",
  },
];

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Rádio HS Digital 🎵 · Ao Vivo" },
      {
        name: "description",
        content: "Ouça a programação oficial da HS Digital com reprodução contínua em segundo plano.",
      },
    ],
  }),
  component: RadioHSPage,
});

export function RadioHSPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [tracks, setTracks] = useState<Track[]>(BACKUP_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [songSwitchCount, setSongSwitchCount] = useState(0);
  const [showClubModal, setShowClubModal] = useState(false);
  const [isLoadingStations, setIsLoadingStations] = useState(true);

  const currentTrack = tracks[currentTrackIndex] || BACKUP_TRACKS[0];

  useEffect(() => {
    async function fetchBrazilianStations() {
      try {
        setIsLoadingStations(true);
        const response = await fetch(
          "https://radio-browser.info"
        );
        
        if (!response.ok) throw new Error("Erro ao acessar API de rádios");
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const apiTracks: Track[] = data.map((station: any, index: number) => {
            const artOptions = [
              "https://unsplash.com",
              "https://unsplash.com",
              "https://unsplash.com",
              "https://unsplash.com"
            ];
            
            return {
              title: station.name,
              artist: station.tags ? station.tags.split(",").slice(0, 2).join(" / ") : "Rádio Brasileira 🇧🇷",
              album: station.state || "Brasil",
              artwork: artOptions[index % artOptions.length],
              src: station.url_resolved || station.url,
            };
          });
          
          setTracks(apiTracks);
        }
      } catch (error) {
        console.error("Falha ao carregar API pública, usando catálogo de segurança:", error);
        setTracks(BACKUP_TRACKS);
      } finally {
        setIsLoadingStations(false);
      }
    }

    fetchBrazilianStations();
  }, []);

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

  const updateMediaSession = (track: Track) => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
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
    } catch (e) {
      console.warn("MediaSession não configurada:", e);
    }
  };

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    audioRef.current.src = currentTrack.src;
    updateMediaSession(currentTrack);

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn("Bloqueio de Autoplay ativado pelo navegador:", err);
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex, tracks]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          updateMediaSession(currentTrack);
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
        })
        .catch((err) => {
          console.error("Erro ao iniciar áudio:", err);
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
    }

    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8">
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => {
          setIsPlaying(true);
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
        }}
        onPause={() => {
          setIsPlaying(false);
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        }}
        onEnded={handleNextTrack}
      />

      {/* Header */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">HS DIGITAL STREAM</h1>
            <p className="text-[11px] text-slate-400">Estações em Português 🇧🇷</p>
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Ouvir sem Anúncios
          </Link>
        )}
      </header>

      {/* Card do Player */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          
          {isLoadingStations && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Sintonizando rádios ao vivo...</p>
            </div>
          )}

          {/* Capa */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-6 shadow-xl border border-slate-700/50">
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {isPlaying && (
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
SINAL AO VIVO

)}
{/* Info */}

{currentTrack.title}
{currentTrack.artist}
{currentTrack.album}
{/* Controles */}



<button
onClick={togglePlay}
className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-transform active:scale-95"
title={isPlaying ? "Pausar" : "Tocar"}
>
{isPlaying ?  : }
{/* Volume */}

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


{/* Footer */}

Conectado à API pública Radio-Browser • Background ativo.
{/* Modal Premium */}
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
R$ 19,90/mês e ouça sem interrupções publicitárias!
Assinar Clube HS por R$ 19,90
<Button
variant="ghost"
onClick={() => {
setShowClubModal(false);
togglePlay();
}}
className="text-xs text-slate-400 hover:text-white"
>
Continuar ouvindo com anúncios

Membros do clube têm player 100% liberado.



)}

);
}
