import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      "Atenção clientes da HS Digital! Você já conhece o Clube HS? Por apenas dezenove e noventa ao mês, você garante frete grátis na sua região, ouve nossa rádio sem anúncios e tem descontos VIP exclusivos em milhares de produtos. Acesse o menu Clube HS e assine agora mesmo!",
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
    id: "ia-aura-atendimento",
    tag: "Tecnologia & IA",
    title: "Atendimento 24h com a Aura",
    script:
      "Dúvidas sobre produtos, pedidos ou frete? Fale com a Aura, nossa assistente de inteligência artificial pronta para te atender a qualquer hora do dia. Aproveite as melhores ofertas da nossa vitrine e boas compras!",
  },
];

// 🎵 Trilhas de Fundo Instrumentais (perfeitas para locução e compras)
export const RADIO_BACKGROUND_TRACKS: RadioTrack[] = [
  {
    title: "Sertanejo Acústico & Melodias",
    artist: "Trilha Oficial HS Digital",
    album: "Brasil Sessions",
    artwork: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=512&q=80",
    src: "https://cast.mgtradio.net/radio/8020/aac",
  },
  {
    title: "Hs Gospel",
    artist: "Trilha Gospel",
    album: "Mark Trilha Sessions",
    artwork: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=512&q=80",
    src: "http://ec5.yesstreaming.net:1890/stream",
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

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [songSwitchCount, setSongSwitchCount] = useState(0);
  const [showClubModal, setShowClubModal] = useState(false);

  // Estados do Locutor Virtual
  const [isLocutorSpeaking, setIsLocutorSpeaking] = useState(false);
  const [locutorEnabled, setLocutorEnabled] = useState(true);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<RadioAnnouncement | null>(null);

  const currentTrack = RADIO_BACKGROUND_TRACKS[currentTrackIndex];

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

  // Integração com controles nativos de segundo plano e tela de bloqueio
  const updateMediaSession = (track: RadioTrack) => {
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
  };

  // 🎙️ Função de fala do Locutor com Audio Ducking (abaixa o som de fundo enquanto fala)
  const speakAnnouncement = useCallback(
    (scriptObj: RadioAnnouncement) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(scriptObj.script);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05; // ritmo animado de rádio
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
        // Ducking de áudio: reduz para 15% para dar destaque à voz
        if (audioRef.current) {
          audioRef.current.volume = (isMuted ? 0 : volume) * 0.2;
        }
      };

      const handleEnd = () => {
        setIsLocutorSpeaking(false);
        // Restaura o volume normal da trilha
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
    speakAnnouncement(HS_MARKETING_SCRIPTS[targetIdx]);
  };

  // Agendamento automático de anúncios a cada 90 segundos enquanto estiver tocando
  useEffect(() => {
    if (!isPlaying || !locutorEnabled) return;

    const interval = setInterval(() => {
      if (!isLocutorSpeaking) {
        setAnnouncementIndex((prev) => {
          const next = (prev + 1) % HS_MARKETING_SCRIPTS.length;
          speakAnnouncement(HS_MARKETING_SCRIPTS[next]);
          return next;
        });
      }
    }, 50000); // 90 segundos entre anúncios

    return () => clearInterval(interval);
  }, [isPlaying, locutorEnabled, isLocutorSpeaking, speakAnnouncement]);

  // Atualização da fonte ao trocar de faixa
  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.src = currentTrack.src;
    updateMediaSession(currentTrack);

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn("Autoplay:", err);
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex]);

  // Controle de volume
  useEffect(() => {
    if (audioRef.current && !isLocutorSpeaking) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, isLocutorSpeaking]);

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
        // Fala de boas-vindas do locutor ao iniciar pela primeira vez
        if (locutorEnabled && !isLocutorSpeaking) {
          setTimeout(() => {
            speakAnnouncement(HS_MARKETING_SCRIPTS[0]);
          }, 1500);
        }
      })
      .catch((err) => {
        console.error("Erro ao iniciar áudio:", err);
      });
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
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

    setCurrentTrackIndex((prev) => (prev + 1) % RADIO_BACKGROUND_TRACKS.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex(
      (prev) => (prev - 1 + RADIO_BACKGROUND_TRACKS.length) % RADIO_BACKGROUND_TRACKS.length
    );
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    play();
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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
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
