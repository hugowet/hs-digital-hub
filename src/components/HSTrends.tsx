import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  ShoppingBag,
  ExternalLink,
  Crown,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Music2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type TrendPost = {
  id: string;
  post_type: "organic" | "product" | "ad";
  video_url: string;
  thumbnail_url?: string;
  author_name: string;
  author_avatar: string;
  description: string;
  music_title: string;
  likes_count: number;
  comments_count: number;
  // Campos específicos de Produto
  product_id?: string;
  product_title?: string;
  product_price?: number;
  // Campos específicos de Anúncio Nativo
  ad_badge?: string; // ex: "Institucional HS" ou "Lojista Parceiro Perdizes"
  cta_label?: string; // ex: "Assinar Clube HS" ou "Saiba Mais"
  cta_url?: string; // ex: "/clube-hs" ou URL externa
  is_external?: boolean;
};

// Base de Conteúdos Orgânicos (Novelinhas de Frutas e Feedbacks de Clientes)
const ORGANIC_FEED: TrendPost[] = [
  {
    id: "org-1",
    post_type: "organic",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    author_name: "Novelinhas da Feira 🍊",
    author_avatar: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80",
    description: "Capítulo 12: A Laranja descobriu que o Limão estava na promoção! 😱🍊🍋 #Novelinha #FrutasHS",
    music_title: "Som Original · Novelinhas da Feira",
    likes_count: 1420,
    comments_count: 89,
  },
  {
    id: "prod-1",
    post_type: "product",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    author_name: "Mari Reviews 📦",
    author_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
    description: "Chegou em 2 dias em Perdizes! Testando a caixinha bluetooth que comprei no marketplace da HS. Som absurdo!",
    music_title: "Unboxing & Review · HS Digital",
    likes_count: 3890,
    comments_count: 215,
    product_id: "prod-caixa-som",
    product_title: "Caixa de Som Bluetooth Pro",
    product_price: 129.9,
  },
  {
    id: "org-2",
    post_type: "organic",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    author_name: "Frutas em Foco 🥑",
    author_avatar: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=150&q=80",
    description: "Quando o Abacate tenta entrar no Clube HS achando que é legume 😂🥑 #Comedia #Hortifruti",
    music_title: "Áudio Engraçado · Trends Brasil",
    likes_count: 2710,
    comments_count: 140,
  },
  {
    id: "prod-2",
    post_type: "product",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    author_name: "Lucas Tech ⚡",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    description: "Feedback sincero do Smartwatch com frete grátis da HS Digital. Bateria durou 1 semana!",
    music_title: "Tech Beats · Review Eletrônicos",
    likes_count: 5120,
    comments_count: 334,
    product_id: "prod-smartwatch",
    product_title: "Smartwatch Ultra Fit 2",
    product_price: 189.9,
  },
  {
    id: "org-3",
    post_type: "organic",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    author_name: "Drama do Morango 🍓",
    author_avatar: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=150&q=80",
    description: "O Morango se apaixonou pela Maçã Gala da loja vizinha. Veja o final dessa história! 🍓🍎",
    music_title: "Novela Mexicana · Trilha Dramática",
    likes_count: 4200,
    comments_count: 290,
  },
  {
    id: "prod-3",
    post_type: "product",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    author_name: "Cliente VIP 🛍️",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
    description: "Minha primeira compra com aprovação instantânea no PIX! Veio tudo super bem embalado.",
    music_title: "Review de Compras · HS Marketplace",
    likes_count: 1950,
    comments_count: 78,
    product_id: "prod-fone-sem-fio",
    product_title: "Fone de Ouvido TWS Noise Cancelling",
    product_price: 99.0,
  },
];

// Base de Anúncios Comerciais e Institucionais
const NATIVE_ADS: TrendPost[] = [
  {
    id: "ad-clube-hs",
    post_type: "ad",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    author_name: "HS Digital Oficial 🌟",
    author_avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&q=80",
    description: "Cansado de pagar frete? Assine o Clube HS por apenas R$ 19,90/mês e tenha Frete Grátis na região de Perdizes + Feed 100% sem anúncios!",
    music_title: "Comercial Oficial · Clube HS Fidelidade",
    likes_count: 890,
    comments_count: 32,
    ad_badge: "Institucional HS Digital",
    cta_label: "Assinar Clube HS por R$ 19,90",
    cta_url: "/clube-hs",
    is_external: false,
  },
  {
    id: "ad-padaria-perdizes",
    post_type: "ad",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
    author_name: "Padaria Real de Perdizes 🥖",
    author_avatar: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&q=80",
    description: "Pães artesanais quentinhos toda manhã e café colonial especial para o seu dia. Peça online pelo nosso delivery parceiro!",
    music_title: "Anúncio Parceiro · Comércio Local Perdizes",
    likes_count: 650,
    comments_count: 19,
    ad_badge: "Lojista Parceiro do Bairro",
    cta_label: "Saiba Mais e Peça Agora",
    cta_url: "https://wa.me/5511999999999?text=Vi+o+anuncio+no+HSTrends",
    is_external: true,
  },
];

export function HSTrends() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // 1. Consulta se o usuário autenticado tem o plano 'is_clube_hs' ativo no Supabase
  const { data: userProfile, isLoading: isCheckingClube } = useQuery({
    queryKey: ["hstrends-user-clube-status"],
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

  // 2. ALGORITMO DE INJEÇÃO NATIVA DE VÍDEOS COMERCIAIS (a cada 4 vídeos)
  // Se o usuário for membro ativo do Clube HS (is_clube_hs = true), os anúncios são 100% PULADOS!
  const processedFeed = useMemo(() => {
    if (isVipClube) {
      // Feed VIP: 100% limpo, sem anúncios
      return ORGANIC_FEED;
    }

    // Feed Comum: injeta 1 anúncio a cada 4 vídeos assistidos
    const result: TrendPost[] = [];
    let adPointer = 0;

    for (let i = 0; i < ORGANIC_FEED.length; i++) {
      result.push(ORGANIC_FEED[i]);

      // Injeta anúncio comercial obrigatoriamente a cada 4 vídeos
      if ((i + 1) % 4 === 0) {
        const adToInject = NATIVE_ADS[adPointer % NATIVE_ADS.length];
        result.push(adToInject);
        adPointer++;
      }
    }

    return result;
  }, [isVipClube]);

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleShare = (post: TrendPost) => {
    if (navigator.share) {
      navigator.share({
        title: post.author_name,
        text: post.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="relative h-screen w-full bg-black text-white flex justify-center overflow-hidden font-sans select-none">
      {/* Container Principal estilo TikTok (Mobile Centered) */}
      <div className="relative h-full w-full max-w-md bg-black shadow-2xl flex flex-col justify-between">
        
        {/* Barra Superior Flutuante */}
        <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <Link
            to="/"
            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Abas Superiores */}
          <div className="flex items-center gap-4 text-sm font-bold tracking-wide drop-shadow-md">
            <span className="text-white/60 cursor-pointer">Seguindo</span>
            <span className="text-white border-b-2 border-white pb-0.5 cursor-pointer">
              Para Você
            </span>
          </div>

          {/* Status VIP do Clube HS ou Botão de Assinatura */}
          {isVipClube ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold shadow-lg shadow-amber-400/30">
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              VIP Sem Anúncios
            </div>
          ) : (
            <Link
              to="/clube-hs"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold backdrop-blur-md"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              Tirar Anúncios
            </Link>
          )}
        </header>

        {/* FEED COM ROLAGEM VERTICAL MAGNÉTICA (SNAP-Y) */}
        <div
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
          onScroll={(e) => {
            const container = e.currentTarget;
            const index = Math.round(container.scrollTop / container.clientHeight);
            if (index !== currentIndex && index >= 0 && index < processedFeed.length) {
              setCurrentIndex(index);
            }
          }}
        >
          {processedFeed.map((post, idx) => {
            const isActive = idx === currentIndex;
            const isLiked = Boolean(likedPosts[post.id]);
            const isAd = post.post_type === "ad";

            return (
              <div
                key={`${post.id}-${idx}`}
                className="relative h-full w-full snap-start snap-always shrink-0 flex items-center justify-center bg-zinc-950 overflow-hidden"
              >
                {/* Reprodutor de Vídeo */}
                <VideoPlayer
                  src={post.video_url}
                  isActive={isActive}
                  isMuted={isMuted}
                  onToggleMute={() => setIsMuted((prev) => !prev)}
                />

                {/* Camada de Gradiente Escuro na Base */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/90 z-10" />

                {/* BARRA LATERAL DE AÇÕES (LIKE, COMENTÁRIOS, SHARE, MUTE) */}
                <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5 text-white">
                  {/* Foto do Autor */}
                  <div className="relative mb-2">
                    <img
                      src={post.author_avatar}
                      alt={post.author_name}
                      className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-lg"
                    />
                    {isAd && (
                      <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 fill-amber-500 text-slate-950" />
                      </span>
                    )}
                  </div>

                  {/* Botão de Curtir */}
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex flex-col items-center gap-1 group active:scale-125 transition-transform"
                  >
                    <div
                      className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                        isLiked ? "bg-rose-600/30 text-rose-500" : "bg-black/40 text-white"
                      }`}
                    >
                      <Heart className={`w-6 h-6 ${isLiked ? "fill-rose-500" : ""}`} />
                    </div>
                    <span className="text-[11px] font-bold drop-shadow">
                      {isLiked ? post.likes_count + 1 : post.likes_count}
                    </span>
                  </button>

                  {/* Comentários */}
                  <button className="flex flex-col items-center gap-1 active:scale-110 transition-transform">
                    <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold drop-shadow">{post.comments_count}</span>
                  </button>

                  {/* Compartilhar */}
                  <button
                    onClick={() => handleShare(post)}
                    className="flex flex-col items-center gap-1 active:scale-110 transition-transform"
                  >
                    <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold drop-shadow">Compartilhar</span>
                  </button>

                  {/* Alternador de Áudio (Mute/Unmute) */}
                  <button
                    onClick={() => setIsMuted((prev) => !prev)}
                    className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white mt-2 active:scale-110 transition-transform"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                  </button>
                </div>

                {/* INFORMAÇÕES DA LEGENDA & CTAs (RODAPÉ DO VÍDEO) */}
                <div className="absolute left-4 right-16 bottom-6 z-20 space-y-3">
                  {/* Selo do Tipo de Post */}
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white drop-shadow">
                      {post.author_name}
                    </span>

                    {/* Selo de Patrocinado / Anúncio Nativo */}
                    {isAd && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                        {post.ad_badge || "Patrocinado"}
                      </span>
                    )}
                  </div>

                  {/* Legenda do Vídeo */}
                  <p className="text-xs text-white/95 leading-relaxed line-clamp-3 drop-shadow">
                    {post.description}
                  </p>

                  {/* Ticker de Música */}
                  <div className="flex items-center gap-2 text-[11px] text-white/80 font-medium">
                    <Music2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="truncate max-w-[220px]">{post.music_title}</span>
                  </div>

                  {/* CASO 1: VÍDEO DE ANÚNCIO (post_type: 'ad') -> SEM SACOLA, COM BOTÃO CTA DESTACADO */}
                  {isAd && post.cta_label && (
                    <div className="pt-2">
                      {post.is_external ? (
                        <a
                          href={post.cta_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 transition-transform active:scale-95"
                        >
                          {post.cta_label}
                          <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                        </a>
                      ) : (
                        <Link
                          to={post.cta_url || "/clube-hs"}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 transition-transform active:scale-95"
                        >
                          <Crown className="w-4 h-4 fill-slate-950" />
                          {post.cta_label}
                        </Link>
                      )}
                    </div>
                  )}

                  {/* CASO 2: VÍDEO ORGÂNICO COM PRODUTO VINCULADO (com sacola de compras) */}
                  {!isAd && post.product_id && (
                    <div className="pt-1">
                      <Button
                        asChild
                        size="sm"
                        className="w-full bg-white/90 hover:bg-white text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-between px-3 h-10 border border-white/40 backdrop-blur-md"
                      >
                        <Link to={`/produto/${post.product_id}`}>
                          <div className="flex items-center gap-2 truncate">
                            <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">{post.product_title}</span>
                          </div>
                          {post.product_price && (
                            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg shrink-0">
                              R$ {post.product_price.toFixed(2).replace(".", ",")}
                            </span>
                          )}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Sub-componente Reprodutor de Vídeo Isolado com Play/Pause ao Toque
function VideoPlayer({
  src,
  isActive,
  isMuted,
  onToggleMute,
}: {
  src: string;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay com áudio costuma ser bloqueado sem toque; silencia e tenta de novo
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const handleVideoClick = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div
      onClick={handleVideoClick}
      className="relative w-full h-full cursor-pointer flex items-center justify-center bg-black"
    >
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        muted={isMuted}
        className="w-full h-full object-cover"
      />

      {/* Ícone de Pause quando o usuário toca para pausar o vídeo */}
      {!isPlaying && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
            <Play className="w-8 h-8 fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}
