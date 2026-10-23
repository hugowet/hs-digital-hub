// @ts-nocheck -- types out of sync with backend schema; see build log
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { radioRecoveryDelay, shouldRestartRadio } from "./radio-recovery";

export interface RadioTrack {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  src: string;
}

export interface RadioAnnouncement {
  id: string;
  tag: string;
  title: string;
  script: string;
}

// 🎙️ Roteiros Oficiais do Locutor Virtual HS Digital
export const HS_MARKETING_SCRIPTS: RadioAnnouncement[] = [
  {
    id: "Entrada-principal",
    tag: "Chamada Principal",
    title: "Boas vindas",
    script:
      "Seja muito bem-vindo à HS Digital! O marketplace que une inovação e praticidade às suas compras. Prepare-se para uma experiência única, rápida e 100% segura.",
  },
  {
    id: "Sugestão principal",
    tag: "Rádio Hs",
    title: "Sugestão carismatica",
    script:
      "Que tal fazer suas compras ouvindo música? Com a rádio da HS Digital, você navega com a melhor qualidade do mercado, unindo inovação e praticidade.",
  },
  {
    id: "Anúncio Afiliados",
    tag: "Programa de Afiliados",
    title: "Sugestão persuasiva",
    script:
      "Você já conhece o Programa de Afiliados da HS Digital? Seja um afiliado oficial, divulgue seu link exclusivo e ganhe 10% de comissão em cada venda direto no seu saldo!",
  },
  {
    id: "clube-hs",
    tag: "Clube VIP",
    title: "Clube HS por R$ 19,90",
    script:
      "Atenção clientes da HS Digital! Você já conhece o Clube HS? Por apenas dezenove e noventa ao mês, você garante frete grátis na sua região, ouve nossa rádio sem chamadas promocionais da HS Digital e tem descontos VIP exclusivos em milhares de produtos. Acesse o menu Clube HS e assine agora mesmo!",
  },
  {
    id: "jogos-premios",
    tag: "Jogos & Sorte",
    title: "Roleta da Sorte e Raspadinha",
    script:
      "Quer ganhar prêmios e cupons na hora enquanto faz suas compras? Na HS Digital você se diverte na nossa área de jogos! Gire a Roleta da Sorte e tente a sorte na Raspadinha Oficial da HS Digital para faturar super descontos no seu carrinho!",
  },
  {
    id: "seguranca-marketplace",
    tag: "Segurança & Confiança",
    title: "Compra 100% Protegida",
    script:
      "Compre com total segurança e garantia na HS Digital. Todos os pagamentos contam com proteção de ponta a ponta, rastreamento em tempo real e entrega rápida para todo o Brasil. Os melhores produtos e lojas em um só marketplace!",
  },
  {
    id: "variedade-produtos",
    tag: "Variedade & Preço Baixo",
    title: "Tudo em um só lugar",
    script:
      "Eletrônicos, moda, casa e utilidades: os melhores fornecedores nacionais e internacionais estão reunidos na HS Digital. Preço justo, compra garantida e suporte humanizado para você comprar sem preocupação!",
  },
  {
    id: "ia-aura-atendimento",
    tag: "Tecnologia & IA",
    title: "Atendimento 24h com a Aura",
    script:
      "Dúvidas sobre produtos, pedidos ou frete? Fale com a Aura, nossa assistente de inteligência artificial pronta para te atender a qualquer hora do dia. Aproveite as melhores ofertas da nossa vitrine e boas compras!",
  },
];

// 🎵 Trilhas e Streams Estáveis da Rádio HS Digital
export const RADIO_BACKGROUND_TRACKS: RadioTrack[] = [
  {
    title: "Rádio HS Sertaneja",
    artist: "Oficial HS Digital",
    album: "Brasil Sessions",
    artwork: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=512&q=80",
    src: "https://cast.mgtradio.net/radio/8020/aac",
  },
  {
    title: "Sertanejo Hits 2026",
    artist: "Top Sertanejo Brasil",
    album: "Lançamentos & Modão",
    artwork: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=512&q=80",
    src: "https://cast.mgtradio.net/radio/8000/aac",
  },
  {
    title: "Hs Gospel",
    artist: "Trilha Gospel",
    album: "Rádio HS Digital",
    artwork: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=512&q=80",
    src: "https://stream.zeno.fm/0r0xa792kwzuv",
  },
  {
    title: "Pop & Eletrônica Suave",
    artist: "Trilha Oficial HS Digital",
    album: "Modern Store Vibe",
    artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&q=80",
    src: "https://streams.ilovemusic.de/iloveradio1.mp3",
  },
  {
    title: "Groove & Ambient Coffee",
    artist: "Trilha Oficial HS Digital",
    album: "Relax & Shop",
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
  isLocutorSpeaking: boolean;
  currentAnnouncement: RadioAnnouncement | null;
  announcements: RadioAnnouncement[];
  locutorEnabled: boolean;
  isReconnecting: boolean;
  setShowClubModal: (show: boolean) => void;
  setLocutorEnabled: (enabled: boolean) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  handleNextTrack: () => void;
  handlePrevTrack: () => void;
  selectTrack: (index: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean | ((prev: boolean) => boolean)) => void;
  speakAnnouncementNow: (index?: number) => void;
}

const RadioContext = createContext<RadioContextType | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const shouldBePlayingRef = useRef(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Estados do Locutor Virtual
  const [isLocutorSpeaking, setIsLocutorSpeaking] = useState(false);
  const [locutorEnabled, setLocutorEnabled] = useState(true);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<RadioAnnouncement | null>(null);

  const currentTrack = RADIO_BACKGROUND_TRACKS[currentTrackIndex];
  const trackRef = useRef(currentTrack);
  trackRef.current = currentTrack;

  // Validação Clube HS VIP
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

  useEffect(() => {
    if (isVipClube) { window.speechSynthesis?.cancel(); setIsLocutorSpeaking(false); }
  }, [isVipClube]);

  // MediaSession para controle na tela de bloqueio e segundo plano
  const updateMediaSession = useCallback((track: RadioTrack) => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${track.title} 🎙️`,
        artist: "Rádio HS Digital Oficial",
        album: "Marketplace HS Digital",
        artwork: [
          { src: track.artwork, sizes: "96x96", type: "image/jpeg" },
          { src: track.artwork, sizes: "128x128", type: "image/jpeg" },
          { src: track.artwork, sizes: "256x256", type: "image/jpeg" },
          { src: track.artwork, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => play());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => handlePrevTrack());
      navigator.mediaSession.setActionHandler("nexttrack", () => handleNextTrack());
    } catch (e) {
      console.warn("MediaSession:", e);
    }
  }, []);

  const clearRecovery = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) window.clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }, []);

  const reconnectStream = useCallback((buffering = false) => {
    if (!shouldBePlayingRef.current || !audioRef.current || reconnectTimeoutRef.current !== null) return;
    setIsReconnecting(true);
    if (retryCountRef.current >= 8) { setIsPlaying(false); setIsReconnecting(false); shouldBePlayingRef.current = false; return; }
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      const audio = audioRef.current;
      if (!audio || !shouldBePlayingRef.current) return;
      if (!shouldRestartRadio(audio, buffering)) { setIsReconnecting(false); return; }
      retryCountRef.current += 1;
      audio.src = trackRef.current.src;
      audio.load();
      audio.play().catch((err) => {
        if (err.name === "NotAllowedError") { shouldBePlayingRef.current = false; setIsPlaying(false); setIsReconnecting(false); return; }
        reconnectStream(false);
      });
    }, radioRecoveryDelay(retryCountRef.current, buffering));
  }, []);

  useEffect(() => () => {
    clearRecovery();
    shouldBePlayingRef.current = false;
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
  }, [clearRecovery]);

  // Locutor Virtual com Audio Ducking
  const speakAnnouncement = useCallback(
    (scriptObj: RadioAnnouncement) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(scriptObj.script);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(
        (v) => v.lang.includes("pt-BR") || v.lang.includes("pt_BR") || v.lang.startsWith("pt")
      );
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onstart = () => {
        setIsLocutorSpeaking(true);
        setCurrentAnnouncement(scriptObj);
        if (audioRef.current) {
          audioRef.current.volume = (isMuted ? 0 : volume) * 0.2;
        }
      };

      const handleEnd = () => {
        setIsLocutorSpeaking(false);
        if (audioRef.current) {
          audioRef.current.volume = isMuted ? 0 : volume;
        }
      };

      utterance.onend = handleEnd;
      utterance.onerror = handleEnd;

      window.speechSynthesis.speak(utterance);
    },
    [volume, isMuted]
  );

  const speakAnnouncementNow = (index?: number) => {
    const targetIdx =
      typeof index === "number" ? index : (announcementIndex + 1) % HS_MARKETING_SCRIPTS.length;
    setAnnouncementIndex(targetIdx);
    if (!isVipClube) speakAnnouncement(HS_MARKETING_SCRIPTS[targetIdx]);
  };

  // Locução periódica a cada 75s
  useEffect(() => {
    if (!isPlaying || !locutorEnabled || isVipClube) return;

    const interval = setInterval(() => {
      if (!isLocutorSpeaking && shouldBePlayingRef.current) {
        setAnnouncementIndex((prev) => {
          const next = (prev + 1) % HS_MARKETING_SCRIPTS.length;
          speakAnnouncement(HS_MARKETING_SCRIPTS[next]);
          return next;
        });
      }
    }, 75000);

    return () => clearInterval(interval);
  }, [isPlaying, locutorEnabled, isLocutorSpeaking, speakAnnouncement, isVipClube]);

  // Troca de faixa
  useEffect(() => {
    if (!audioRef.current) return;

    clearRecovery();
    retryCountRef.current = 0;
    audioRef.current.src = currentTrack.src;
    audioRef.current.load();
    updateMediaSession(currentTrack);

    if (shouldBePlayingRef.current) {
      audioRef.current.play().catch(() => reconnectStream(false));
    }
  }, [currentTrackIndex, currentTrack, updateMediaSession, reconnectStream, clearRecovery]);

  // Ajuste de volume contínuo
  useEffect(() => {
    if (audioRef.current && !isLocutorSpeaking) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, isLocutorSpeaking]);

  const play = () => {
    if (!audioRef.current) return;
    shouldBePlayingRef.current = true;
    clearRecovery();
    retryCountRef.current = 0;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsReconnecting(false);
        updateMediaSession(currentTrack);
        if (typeof window !== "undefined" && "mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      })
      .catch((err) => {
        console.warn("Tentando iniciar stream com auto-retry:", err);
        if (err.name === "NotAllowedError") { shouldBePlayingRef.current = false; setIsPlaying(false); return; }
        reconnectStream(false);
      });
  };

  const pause = () => {
    shouldBePlayingRef.current = false;
    clearRecovery();
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    setIsReconnecting(false);

    if (typeof window !== "undefined") {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }
    setIsLocutorSpeaking(false);
  };

  const togglePlay = () => {
    if (isPlaying || shouldBePlayingRef.current) {
      pause();
    } else {
      play();
    }
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % RADIO_BACKGROUND_TRACKS.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex(
      (prev) => (prev - 1 + RADIO_BACKGROUND_TRACKS.length) % RADIO_BACKGROUND_TRACKS.length
    );
  };

  const selectTrack = (index: number) => {
    if (!RADIO_BACKGROUND_TRACKS[index]) return;
    if (index === currentTrackIndex) { play(); return; }
    shouldBePlayingRef.current = true;
    clearRecovery();
    setCurrentTrackIndex(index);
  };

  return (
    <RadioContext.Provider
      value={{
        tracks: RADIO_BACKGROUND_TRACKS,
        currentTrackIndex,
        currentTrack,
        isPlaying,
        volume,
        isMuted,
        isVipClube,
        showClubModal,
        isLocutorSpeaking,
        currentAnnouncement,
        announcements: HS_MARKETING_SCRIPTS,
        locutorEnabled,
        isReconnecting,
        setShowClubModal,
        setLocutorEnabled,
        togglePlay,
        play,
        pause,
        handleNextTrack,
        handlePrevTrack,
        selectTrack,
        setVolume,
        setIsMuted,
        speakAnnouncementNow,
      }}
    >
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => {
          setIsPlaying(true);
          setIsReconnecting(false);
        }}
        onPause={() => {
          if (!shouldBePlayingRef.current) {
            setIsPlaying(false);
          }
        }}
        onPlaying={() => { clearRecovery(); retryCountRef.current = 0; setIsPlaying(true); setIsReconnecting(false); }}
        onWaiting={() => {
          if (shouldBePlayingRef.current) reconnectStream(true);
        }}
        onStalled={() => {
          if (shouldBePlayingRef.current) reconnectStream(true);
        }}
        onError={() => {
          if (shouldBePlayingRef.current) { clearRecovery(); reconnectStream(false); }
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
