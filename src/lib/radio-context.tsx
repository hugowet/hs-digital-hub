import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RadioTrack {
  id: string;
  genre: "sertanejo" | "gospel" | "funk" | "forro" | "virais";
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

// 🎙️ 8 Roteiros Oficiais do Locutor Virtual HS Digital (Com Programa de Afiliados)
export const HS_MARKETING_SCRIPTS: RadioAnnouncement[] = [
  {
    id: "promo-principal",
    tag: "Chamada Principal",
    title: "Evolução e Economia HS",
    script:
      "É isso aí pessoal, HS Digital evoluindo com tecnologia! Venha comprar, venha economizar, aqui você tem envio rápido e frete grátis!",
  },
  {
    id: "programa-afiliados",
    tag: "Ganhe Dinheiro",
    title: "Programa de Afiliados Oficial",
    script:
      "Atenção! Você sabia que pode lucrar todo dia com a HS Digital? Participe do nosso Programa de Afiliados! Compartilhe o seu link da loja ou dos seus produtos favoritos nas redes sociais e receba 10% de comissão automática direto no seu painel em cada venda confirmada. Clique no botão Afiliados ao lado do carrinho e comece a faturar agora!",
  },
  {
    id: "clube-hs",
    tag: "Clube VIP",
    title: "Clube HS por R$ 19,90",
    script:
      "Atenção clientes da HS Digital! Você já conhece o Clube HS? Por apenas dezenove e noventa ao mês, você garante frete grátis, ouve nossa rádio sem anúncios e tem descontos VIP exclusivos em milhares de produtos. Acesse o menu Clube HS e assine agora mesmo!",
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
    id: "produtos-virais",
    tag: "Tendências",
    title: "Músicas e Produtos Virais",
    script:
      "Você está ouvindo as músicas mais tocadas e virais do momento aqui na Rádio HS Digital! E enquanto curte o som, aproveite as tendências e ofertas exclusivas na nossa vitrine. Produtos em alta com entrega expressa para todo o Brasil!",
  },
  {
    id: "ia-aura-atendimento",
    tag: "Tecnologia & IA",
    title: "Atendimento 24h com a Aura",
    script:
      "Dúvidas sobre produtos, pedidos ou frete? Fale com a Aura, nossa assistente de inteligência artificial pronta para te atender a qualquer hora do dia. Aproveite as melhores ofertas da nossa vitrine e boas compras!",
  },
  {
    id: "vendedores-parceiros",
    tag: "Lojas Oficiais",
    title: "Vendedores Verificados",
    script:
      "Na HS Digital você compra direto de fabricantes e lojas verificadas com estoque garantido e nota fiscal. Encontre eletrônicos, utilidades e novidades com os menores preços da internet!",
  },
];

// 🎵 5 Estações Principais: Sertanejo, Gospel, Funk, Forró e Virais
export const RADIO_BACKGROUND_TRACKS: RadioTrack[] = [
  {
    id: "sertanejo",
    genre: "sertanejo",
    title: "Sertanejo Universitário & Modões",
    artist: "MGT Sertanejo Oficial",
    album: "Estação Sertanejo HS",
    artwork: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=512&q=80",
    src: "https://cast.mgtradio.net/radio/8000/aac",
  },
  {
    id: "gospel",
    genre: "gospel",
    title: "Louvores & Adoração em Alta",
    artist: "MGT Gospel Nacional",
    album: "Estação Gospel HS",
    artwork: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=512&q=80",
    src: "https://cast.mgtradio.net/radio/8040/aac",
  },
  {
    id: "funk",
    genre: "funk",
    title: "Funk Brasil & Ritmos Urbanos",
    artist: "Batidão & Funk Hits",
    album: "Estação Funk HS",
    artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=512&q=80",
    src: "https://streams.ilovemusic.de/iloveradio2.mp3",
  },
  {
    id: "forro",
    genre: "forro",
    title: "Forró, Piseiro & Vaquejada",
    artist: "Piseiro & Forró Hits",
    album: "Estação Forró HS",
    artwork: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=512&q=80",
    src: "https://streams.ilovemusic.de/iloveradio10.mp3",
  },
  {
    id: "virais",
    genre: "virais",
    title: "Músicas Virais & Top Brasil",
    artist: "Hits em Alta no TikTok & Pop",
    album: "Estação Virais HS",
    artwork: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=512&q=80",
    src: "https://streams.ilovemusic.de/iloveradio1.mp3",
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
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);

  // Estados do Locutor Virtual
  const [locutorEnabled, setLocutorEnabled] = useState(true);
  const [isLocutorSpeaking, setIsLocutorSpeaking] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<RadioAnnouncement | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const locutorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentAnnouncementIndexRef = useRef<number>(0);
  const baseVolumeRef = useRef<number>(volume);

  const currentTrack = RADIO_BACKGROUND_TRACKS[currentTrackIndex];

  // Verifica status VIP do Clube HS
  const { data: isVipClube = false } = useQuery({
    queryKey: ["radio-vip-status"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return false;
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("status")
        .eq("user_id", authData.user.id)
        .eq("status", "active")
        .maybeSingle();
      return !!sub;
    },
    staleTime: 5 * 60_000,
  });

  const duckVolume = useCallback((duck: boolean) => {
    if (!audioRef.current) return;
    if (duck) {
      audioRef.current.volume = Math.max(0.12, baseVolumeRef.current * 0.18);
    } else {
      audioRef.current.volume = isMuted ? 0 : baseVolumeRef.current;
    }
  }, [isMuted]);

  // Função do Locutor Virtual com Web Speech API
  const speakAnnouncement = useCallback((index?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isVipClube && !index) return; // VIPs não têm anúncios automáticos

    window.speechSynthesis.cancel();

    const targetIndex =
      index !== undefined
        ? index % HS_MARKETING_SCRIPTS.length
        : currentAnnouncementIndexRef.current % HS_MARKETING_SCRIPTS.length;

    const announcement = HS_MARKETING_SCRIPTS[targetIndex];
    currentAnnouncementIndexRef.current = targetIndex + 1;
    setCurrentAnnouncement(announcement);

    const utterance = new SpeechSynthesisUtterance(announcement.script);
    utterance.lang = "pt-BR";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const brVoice =
      voices.find((v) => v.lang === "pt-BR" && (v.name.includes("Luciana") || v.name.includes("Google") || v.name.includes("Felipe"))) ||
      voices.find((v) => v.lang.startsWith("pt"));
    if (brVoice) utterance.voice = brVoice;

    utterance.onstart = () => {
      setIsLocutorSpeaking(true);
      duckVolume(true);
    };

    utterance.onend = () => {
      setIsLocutorSpeaking(false);
      duckVolume(false);
      setCurrentAnnouncement(null);
    };

    utterance.onerror = () => {
      setIsLocutorSpeaking(false);
      duckVolume(false);
      setCurrentAnnouncement(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [duckVolume, isVipClube]);

  const speakAnnouncementNow = useCallback((index?: number) => {
    speakAnnouncement(index);
  }, [speakAnnouncement]);

  // Intervalo estrito de 1 minuto (60 segundos) para os anúncios do locutor
  useEffect(() => {
    if (locutorIntervalRef.current) clearInterval(locutorIntervalRef.current);

    if (isPlaying && locutorEnabled && !isVipClube) {
      locutorIntervalRef.current = setInterval(() => {
        speakAnnouncement();
      }, 60_000); // Exatamente 1 minuto
    }

    return () => {
      if (locutorIntervalRef.current) clearInterval(locutorIntervalRef.current);
    };
  }, [isPlaying, locutorEnabled, isVipClube, speakAnnouncement]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const setVolume = (val: number) => {
    setVolumeState(val);
    baseVolumeRef.current = val;
    if (audioRef.current && !isLocutorSpeaking) {
      audioRef.current.volume = isMuted ? 0 : val;
    }
  };

  const play = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => console.log("Audio play prevented:", err));
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsLocutorSpeaking(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const selectTrack = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    if (audioRef.current) {
      audioRef.current.src = RADIO_BACKGROUND_TRACKS[index].src;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isPlaying]);

  const handleNextTrack = useCallback(() => {
    const next = (currentTrackIndex + 1) % RADIO_BACKGROUND_TRACKS.length;
    selectTrack(next);
  }, [currentTrackIndex, selectTrack]);

  const handlePrevTrack = useCallback(() => {
    const prev = (currentTrackIndex - 1 + RADIO_BACKGROUND_TRACKS.length) % RADIO_BACKGROUND_TRACKS.length;
    selectTrack(prev);
  }, [currentTrackIndex, selectTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : isLocutorSpeaking ? Math.max(0.12, volume * 0.18) : volume;
    }
  }, [isMuted, volume, isLocutorSpeaking]);

  useEffect(() => {
    if ("mediaSession" in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [{ src: currentTrack.artwork, sizes: "512x512", type: "image/jpeg" }],
      });
      navigator.mediaSession.setActionHandler("play", () => play());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("nexttrack", () => handleNextTrack());
      navigator.mediaSession.setActionHandler("previoustrack", () => handlePrevTrack());
    }
  }, [currentTrack, play, pause, handleNextTrack, handlePrevTrack]);

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
        src={currentTrack.src}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setTimeout(() => {
            if (isPlaying) handleNextTrack();
          }, 3000);
        }}
      />
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) {
    throw new Error("useRadio deve ser usado dentro de um RadioProvider");
  }
  return ctx;
}
