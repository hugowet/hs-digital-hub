import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode, useState, createContext, useContext } from "react";

import appCss = "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "../lib/cart";
import { Toaster } from "../components/ui/sonner";
import { AuraChatWidget } from "../components/aura-chat-widget";

// 📻 1. PLAYLIST PREMIUM: AS MÚSICAS ELETRÔNICAS MAIS FAMOSAS E ANIMADAS DO MUNDO
export const PLAYLIST_RADIO = [
  { 
    title: "Summer Eletrohits Classics", 
    station: "Rádio HS Digital 🎵", 
    session: "Eletrônica Premium 24h", 
    cover: "https://unsplash.com",
    url: "https://pubchoices.com" // 👈 Canal de EDM/Electro House Premium de Alta Energia
  },
  { 
    title: "Tomorrowland Mainstage Mix", 
    station: "Rádio HS Digital 🎵", 
    session: "Só as Melhores Pistas", 
    cover: "https://unsplash.com",
    url: "https://pubchoices.com" // 👈 Streaming de EDM/Dance focado em hits globais
  },
  { 
    title: "Deep House Mood", 
    station: "Rádio HS Digital 🎵", 
    session: "As Mais Tocadas do Spotify", 
    cover: "https://unsplash.com",
    url: "https://pubchoices.com"
  }
];

// 🎙️ 2. TEXTOS DE LOCUÇÃO ULTRA PERSUASIVOS (Comerciais dinâmicos e focados em fechar vendas)
const PROMO_SCRIPTS = [
  "Atenção compradores! HS Digital, evoluindo com tecnologia para transformar a sua vida! Venha fazer a sua compra agora mesmo. O estoque é super limitado e os preços estão despencando. Não perca tempo!",
  "Ei, você aí navegando! Já conferiu a vitrine da HS Digital hoje? Tem novidades exclusivas em eletrônicos, utilidades e ferramentas inteligentes esperando por você. Encha o seu carrinho antes que os cupons de desconto expirem!",
  "Sintonizados na rádio da tecnologia! Sabia que quem faz parte do Clube H S tem vantagens brutais? Sorteios exclusivos, frete grátis garantido e os lançamentos mais cobiçados do mercado antes de todo mundo! Venha fazer sua assinatura agora e mude seu nível!",
  "O produto que você está namorando na tela pode sumir do estoque a qualquer segundo! Compre com total segurança, garantia de entrega e suporte premium. Vem para a HS Digital!"
];

// 📰 3. GIRO DE NOTÍCIAS REAIS DO BRASIL (Mantém o cliente conectado no app)
const REAL_NEWS = [
  "No universo da tecnologia, novas atualizações de segurança prometem blindar transações via Pix em celulares de todo o país, garantindo muito mais proteção aos compradores.",
  "Na economia brasileira, analistas indicam que o setor de comércio digital bateu novos recordes de acessos nesta semana, impulsionado pelas facilidades de frete rápido.",
  "E no mundo dos negócios, as maiores feiras de eletrônicos revelam que os dispositivos inteligentes voltados para automação residencial são a maior tendência do mercado atual."
];

interface AudioContextType {
  isPlaying: boolean;
  togglePlay: () => void;
  volume: number;
  setVolume: (v: number) => void;
  currentTrackIndex: number;
  nextTrack: () => void;
  prevTrack: () => void;
  showPaywall: boolean;
  setShowPaywall: (b: boolean) => void;
  resetCount: () => void;
  isSpeakerTalking: boolean;
  speakerText: string;
}

const AudioContext = createContext<AudioContextType>({
  isPlaying: false, togglePlay: () => {}, volume: 80, setVolume: () => {},
  currentTrackIndex: 0, nextTrack: () => {}, prevTrack: () => {},
  showPaywall: false, setShowPaywall: () => {}, resetCount: () => {},
  isSpeakerTalking: false, speakerText: ""
});

export const useAudio = () => useContext(AudioContext);

let audioInstance: HTMLAudioElement | null = null;

function NotFoundComponent() { return <div className="p-6 text-center">Página não encontrada.</div> }
function ErrorComponent() { return <div className="p-6 text-center">Erro temporário.</div> }

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  shellComponent: RootShell, component: RootComponent, notFoundComponent: NotFoundComponent, errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [songsCount, setSongsCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const [isSpeakerTalking, setIsSpeakerTalking] = useState(false);
  const [speakerText, setSpeakerText] = useState("");

  useEffect(() => {
    if (!audioInstance) {
      audioInstance = new Audio(PLAYLIST_RADIO[currentTrackIndex].url);
      audioInstance.preload = "auto";
      audioInstance.crossOrigin = "anonymous";
      audioInstance.onended = () => { handleSongEnded(); };
    }
  }, []);

  useEffect(() => {
    if (audioInstance) {
      audioInstance.src = PLAYLIST_RADIO[currentTrackIndex].url;
      audioInstance.load();
      if (isPlaying && !isSpeakerTalking) {
        audioInstance.play().catch(err => console.log(err));
      }
    }
  }, [currentTrackIndex]);

  const handleSongEnded = () => {
    if (songsCount >= 2) {
      if (audioInstance) audioInstance.pause();
      setIsPlaying(false);
      setShowPaywall(true);
      return;
    }
    setSongsCount(prev => prev + 1);
    startVirtualAnnouncer();
  };

  // 🎙️ LOCUTOR PERSUASIVO ATIVO
  const startVirtualAnnouncer = () => {
    if (!audioInstance || !('speechSynthesis' in window)) {
      setCurrentTrackIndex(prev => (prev + 1) % PLAYLIST_RADIO.length);
      return;
    }

    // Efeito de estúdio: abaixa a batida eletrônica no fundo para o locutor falar
    audioInstance.volume = 0.12;
    setIsSpeakerTalking(true);

    const agora = new Date();
    const horaTexto = `Agora são ${agora.getHours()} horas e ${agora.getMinutes()} minutos. `;
    const noticiaAleatoria = REAL_NEWS[Math.floor(Math.random() * REAL_NEWS.length)];
    const ofertaAleatoria = PROMO_SCRIPTS[Math.floor(Math.random() * PROMO_SCRIPTS.length)];
    
    // Roteiro fluido e comercial
    const roteiroCompleto = `Sintonize no som! Você está na rádio oficial H S Digital! ${horaTexto} Trazendo os últimos destaques para você: ${noticiaAleatoria} É isso aí! ${ofertaAleatoria}`;
    setSpeakerText(roteiroCompleto);

    const utterance = new SpeechSynthesisUtterance(roteiroCompleto);
    utterance.lang = "pt-BR";
    utterance.rate = 1.05; // Fala ligeiramente acelerada (estilo locutor jovem de rádio pop/EDM)
    utterance.pitch = 1.0; 

    utterance.onend = () => {
      setIsSpeakerTalking(false);
      setSpeakerText("");
      if (audioInstance) {
        audioInstance.volume = volume / 100; // Restaura o pancadão eletrônico no volume cheio
      }
      setCurrentTrackIndex(prev => (prev + 1) % PLAYLIST_RADIO.length);
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePlay = () => {
    if (!audioInstance || showPaywall) return;
    if (audioInstance.paused) {
      audioInstance.play().then(() => setIsPlaying(true)).catch(err => console.log(err));
    } else {
      audioInstance.pause();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsSpeakerTalking(false);
    }
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    if (audioInstance && !isSpeakerTalking) audioInstance.volume = v / 100;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AudioContext.Provider value={{ 
        isPlaying, togglePlay, volume, setVolume: changeVolume, 
        currentTrackIndex, nextTrack: handleSongEnded, prevTrack: () => setCurrentTrackIndex(prev => (prev - 1 + PLAYLIST_RADIO.length) % PLAYLIST_RADIO.length), 
        showPaywall, setShowPaywall, resetCount: () => setSongsCount(0),
        isSpeakerTalking, speakerText
      }}>
        <CartProvider>
          <Outlet />
          <Toaster position="top-center" richColors />
          <AuraChatWidget />
        </CartProvider>
      </AudioContext.Provider>
    </QueryClientProvider>
  );
}
