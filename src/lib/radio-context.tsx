import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RadioTrack {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  src: string;
}

export const RADIO_TRACKS: RadioTrack[] = [
  {
    title: "HS Sertanejo Universitário & Modão",
    artist: "Rádio HS Digital 🎵",
    album: "Top Sertanejo Brasil",
    artwork: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=512&q=80",
    src: "https://cast.mgtradio.net/radio/8020/aac",
  },
  {
    title: "Hs Gospel FM",
    artist: "Rádio HS Digital 🎵",
    album: "Louvor, tracks e músicas",
    artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=512&q=80",
    src: "http://ec5.yesstreaming.net:1890/stream",
  },
  {
    title: "Pop & Top Brasil",
    artist: "Rádio HS Digital 🎵",
    album: "Perdizes Sessions",
    artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=512&q=80",
    src: "https://streams.ilovemusic.de/iloveradio2.mp3",
  },
  {
    title: "HS Hits & Eletrônica",
    artist: "Rádio HS Digital 🎵",
    album: "Perdizes Sessions",
    artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&q=80",
    src: "https://streams.ilovemusic.de/iloveradio1.mp3",
  },
  {
    title: "Lo-Fi Lounge & Chill",
    artist: "Rádio HS Digital 🎵",
    album: "Perdizes Sessions",
    artwork: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=512&q=80",
    src: "https://streams.ilovemusic.de/iloveradio17.mp3",
  },
  {
    title: "Dance & Club Classics",
    artist: "Rádio HS Digital 🎵",
    album: "Perdizes Sessions",
    artwork: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=512&q=80",
    src: "https://streams.ilovemusic.de/iloveradio10.mp3",
  },
];

interface RadioContextType {
  tracks: RadioTrack[];
  currentTrackIndex: number;
  currentTrack: RadioTrack;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isVipClube: boolean;
  showClubModal: boolean;
  setShowClubModal: (show: boolean) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  handleNextTrack: () => void;
  handlePrevTrack: () => void;
  selectTrack: (index: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean | ((prev: boolean) => boolean)) => void;
}

const RadioContext = createContext<RadioContextType | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [songSwitchCount, setSongSwitchCount] = useState(0);
  const [showClubModal, setShowClubModal] = useState(false);

  const currentTrack = RADIO_TRACKS[currentTrackIndex];

  // Validação VIP Clube HS
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

  // Integração nativa com controles de tela de bloqueio e fone
  const updateMediaSession = (track: RadioTrack) => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${track.title} 🎵`,
        artist: track.artist,
        album: track.album || "Marketplace HS Digital",
        artwork: [
          { src: track.artwork, sizes: "96x96", type: "image/jpeg" },
          { src: track.artwork, sizes: "128x128", type: "image/jpeg" },
          { src: track.artwork, sizes: "256x256", type: "image/jpeg" },
          { src: track.artwork, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        play();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        pause();
      });

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        handlePrevTrack();
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        handleNextTrack();
      });
    } catch (e) {
      console.warn("MediaSession não suportada:", e);
    }
  };

  // Atualização da fonte ao trocar de faixa
  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.src = currentTrack.src;
    updateMediaSession(currentTrack);

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn("Autoplay bloqueado:", err);
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex]);

  // Controle de volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const play = () => {
    if (!audioRef.current) return;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        updateMediaSession(currentTrack);
        if (typeof window !== "undefined" && "mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      })
      .catch((err) => {
        console.error("Erro ao reproduzir áudio:", err);
      });
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleNextTrack = () => {
    const nextCount = songSwitchCount + 1;
    setSongSwitchCount(nextCount);

    if (!isVipClube && nextCount % 3 === 0) {
      setShowClubModal(true);
      pause();
    }

    setCurrentTrackIndex((prev) => (prev + 1) % RADIO_TRACKS.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + RADIO_TRACKS.length) % RADIO_TRACKS.length);
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    play();
  };

  return (
    <RadioContext.Provider
      value={{
        tracks: RADIO_TRACKS,
        currentTrackIndex,
        currentTrack,
        isPlaying,
        volume,
        isMuted,
        isVipClube,
        showClubModal,
        setShowClubModal,
        togglePlay,
        play,
        pause,
        handleNextTrack,
        handlePrevTrack,
        selectTrack,
        setVolume,
        setIsMuted,
      }}
    >
      {/* Áudio persistente montado no nível raiz da aplicação */}
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => {
          setIsPlaying(true);
          if (typeof window !== "undefined" && "mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          if (typeof window !== "undefined" && "mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "paused";
          }
        }}
        onEnded={handleNextTrack}
      />
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error("useRadio deve ser usado dentro de um RadioProvider");
  }
  return context;
}
