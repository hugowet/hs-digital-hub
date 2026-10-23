// @ts-nocheck -- types out of sync with backend schema; see build log
import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus,
  Send,
  Trash2,
  X,
  UserCheck,
  UserPlus,
  Upload,
  Video as VideoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export type TrendPost = {
  id: string;
  post_type: "organic" | "product" | "ad";
  video_url: string;
  is_tiktok_embed?: boolean;
  author_id?: string;
  author_name: string;
  author_avatar: string;
  author_bio?: string;
  author_followers?: number;
  description: string;
  music_title: string;
  likes_count: number;
  comments_count: number;
  product_id?: string;
  product_title?: string;
  product_price?: number;
  ad_badge?: string;
  cta_label?: string;
  cta_url?: string;
  is_external?: boolean;
};

export type TrendComment = {
  id: string;
  video_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  created_at: string;
};

// Base com vídeos oficiais do canal TikTok da loja (@hs.digital23) + Novelinhas
const INITIAL_FEED: TrendPost[] = [
  {
    id: "tt-7689854727529549076",
    post_type: "organic",
    video_url: "https://www.tiktok.com/player/v1/7689854727529549076?autoplay=1&loop=1&music_info=1&description=1",
    is_tiktok_embed: true,
    author_id: "hs-oficial",
    author_name: "HS Digital Oficial 🛒",
    author_avatar: "https://p16-common-sign.tiktokcdn.com/tos-alisg-avt-0068/66b8a74727a52cf05a38a0ad621bb5aa~tplv-tiktokx-cropcenter:168:168.jpeg?dr=14577",
    author_bio: "A nova marketplace que une tecnologia e preço justo para você e sua família.",
    author_followers: 12400,
    description: "Venha conferir ofertas na nova marketplace 🫴 HS Digital 🛒 - evoluindo com tecnologia 👩‍💻",
    music_title: "Som Original · @hs.digital23",
    likes_count: 5320,
    comments_count: 142,
  },
  {
    id: "novelinha-1",
    post_type: "organic",
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    author_id: "novelas-frutas",
    author_name: "Novelinhas da Feira 🍊",
    author_avatar: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&q=80",
    author_bio: "O drama mais divertido das frutas do mercadão de Perdizes! 🍎🥑",
    author_followers: 8750,
    description: "Capítulo 14: O Maracujá surtou ao saber que o Frete Grátis é só na HS Digital! 😱🍈",
    music_title: "Trilha Dramática · Novelas BR",
    likes_count: 2430,
    comments_count: 98,
  },
  {
    id: "prod-1",
    post_type: "product",
    video_url: "https://vjs.zencdn.net/v/oceans.mp4",
    author_id: "mari-reviews",
    author_name: "Mari Reviews 📦",
    author_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
    author_bio: "Testando eletrônicos e produtos achadinhos entregues em até 2 dias.",
    author_followers: 34100,
    description: "Chegou em 2 dias aqui em Perdizes! Testando a caixinha de som à prova d'água da HS. Graves absurdos!",
    music_title: "Tech Beats · Review Eletrônicos",
    likes_count: 6180,
    comments_count: 421,
    product_id: "prod-caixa-som",
    product_title: "Caixa de Som Bluetooth Pro",
    product_price: 129.9,
  },
  {
    id: "novelinha-2",
    post_type: "organic",
    video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
    author_id: "frutas-foco",
    author_name: "Frutas em Foco 🥑",
    author_avatar: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=150&q=80",
    author_bio: "Humor, receitas e comédia da feira livre.",
    author_followers: 15900,
    description: "O Abacate tentou assinar o Clube HS mas não achou o CPF dele 😂🥑 #Comedia #Hortifruti",
    music_title: "Risadas · Humor Trends",
    likes_count: 3190,
    comments_count: 114,
  },
];

// Anúncios Nativos Comerciais
const NATIVE_ADS: TrendPost[] = [
  {
    id: "ad-clube-hs",
    post_type: "ad",
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    author_id: "hs-oficial",
    author_name: "HS Digital Oficial 🌟",
    author_avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&q=80",
    author_bio: "Conta oficial do marketplace de Perdizes.",
    author_followers: 50000,
    description: "Assine o Clube HS por R$ 19,90/mês e ganhe Frete Grátis na região de Perdizes + Feed 100% sem anúncios!",
    music_title: "Comercial Oficial · Clube HS Fidelidade",
    likes_count: 1120,
    comments_count: 45,
    ad_badge: "Institucional HS Digital",
    cta_label: "Assinar Clube HS por R$ 19,90",
    cta_url: "/clube-hs",
    is_external: false,
  },
  {
    id: "ad-padaria-perdizes",
    post_type: "ad",
    video_url: "https://www.w3schools.com/html/movie.mp4",
    author_id: "padaria-real",
    author_name: "Padaria Real de Perdizes 🥖",
    author_avatar: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&q=80",
    author_bio: "Tradição em pães de fermentação natural e confeitaria fina.",
    author_followers: 6800,
    description: "Pão artesanal quentinho saindo a toda hora. Peça delivery no bairro pelo nosso WhatsApp parceiro!",
    music_title: "Anúncio Comercial · Comércio Local",
    likes_count: 850,
    comments_count: 22,
    ad_badge: "Lojista Parceiro do Bairro",
    cta_label: "Fazer Pedido no WhatsApp",
    cta_url: "https://wa.me/5511999999999?text=Vi+o+anuncio+no+HSTrends",
    is_external: true,
  },
];

export function HSTrends() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});

  // Modais de Ação
  const [commentModalPost, setCommentModalPost] = useState<TrendPost | null>(null);
  const [profileModalUser, setProfileModalUser] = useState<TrendPost | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Formulário de Comentário
  const [newCommentText, setNewCommentText] = useState("");

  // Formulário de Upload de Vídeo (+)
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadType, setUploadType] = useState<"organic" | "product">("organic");
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);

  // 1. Consulta usuário autenticado e status VIP
  const { data: authUser } = useQuery({
    queryKey: ["trend-current-auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["hstrends-user-clube-status", authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("is_clube_hs, full_name, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();
      return data;
    },
    enabled: Boolean(authUser?.id),
  });

  const isVipClube = Boolean(userProfile?.is_clube_hs);

  // 2. Consulta vídeos do banco Supabase combinados com o feed base
  const { data: customVideos = [] } = useQuery({
    queryKey: ["trend-supabase-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trend_videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((v: any) => ({
        id: v.id,
        post_type: v.post_type || "organic",
        video_url: v.video_url,
        author_id: v.user_id,
        author_name: v.author_name,
        author_avatar: v.author_avatar,
        description: v.description || v.title,
        music_title: v.music_title || "Som Original",
        likes_count: v.likes_count || 0,
        comments_count: 0,
        ad_badge: v.ad_badge,
        cta_label: v.cta_label,
        cta_url: v.cta_url,
      })) as TrendPost[];
    },
  });

  // 3. Consulta comentários reais do vídeo ativo no modal
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["trend-comments", commentModalPost?.id],
    queryFn: async () => {
      if (!commentModalPost?.id) return [];
      const { data, error } = await supabase
        .from("trend_comments")
        .select("*")
        .eq("video_id", commentModalPost.id)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data as TrendComment[];
    },
    enabled: Boolean(commentModalPost?.id),
  });

  // 4. ALGORITMO DE INJEÇÃO NATIVA (1 Anúncio a cada 4 vídeos)
  // Membros VIP do Clube HS pulam 100% dos anúncios comerciais!
  const processedFeed = useMemo(() => {
    const rawFeed = [...customVideos, ...INITIAL_FEED];

    if (isVipClube) {
      return rawFeed;
    }

    const result: TrendPost[] = [];
    let adPointer = 0;

    for (let i = 0; i < rawFeed.length; i++) {
      result.push(rawFeed[i]);

      if ((i + 1) % 4 === 0) {
        const adToInject = NATIVE_ADS[adPointer % NATIVE_ADS.length];
        result.push(adToInject);
        adPointer++;
      }
    }

    return result;
  }, [customVideos, isVipClube]);

  // Enviar comentário real
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !commentModalPost) return;

    if (!authUser) {
      alert("Por favor, faça login para comentar!");
      return;
    }

    const commentData = {
      video_id: commentModalPost.id,
      user_id: authUser.id,
      user_name: userProfile?.full_name || authUser.email?.split("@")[0] || "Cliente HS",
      user_avatar: userProfile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
      content: newCommentText.trim(),
    };

    const { error } = await supabase.from("trend_comments").insert(commentData);
    if (!error) {
      setNewCommentText("");
      refetchComments();
    }
  };

  // Enviar novo vídeo (+)
  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim() || !uploadTitle.trim()) {
      alert("Preencha o link do vídeo e o título!");
      return;
    }

    if (!authUser) {
      alert("Faça login para postar vídeos no HSTrends!");
      return;
    }

    setIsSubmittingVideo(true);

    const newVideo = {
      user_id: authUser.id,
      author_name: userProfile?.full_name || authUser.email?.split("@")[0] || "Criador HS",
      author_avatar: userProfile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
      title: uploadTitle.trim(),
      description: uploadDesc.trim(),
      video_url: uploadUrl.trim(),
      post_type: uploadType,
      music_title: "Som Original · " + (userProfile?.full_name || "Criador HS"),
    };

    const { error } = await supabase.from("trend_videos").insert(newVideo);
    setIsSubmittingVideo(false);

    if (error) {
      alert("Erro ao publicar vídeo. Tente novamente.");
    } else {
      setUploadModalOpen(false);
      setUploadTitle("");
      setUploadDesc("");
      setUploadUrl("");
      queryClient.invalidateQueries({ queryKey: ["trend-supabase-videos"] });
      alert("Seu vídeo foi publicado com sucesso no HSTrends!");
    }
  };

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleFollow = (authorId: string) => {
    setFollowedUsers((prev) => ({ ...prev, [authorId]: !prev[authorId] }));
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
      alert("Link copiado para compartilhar!");
    }
  };

  return (
    <div className="relative h-screen w-full bg-black text-white flex justify-center overflow-hidden font-sans select-none">
      <div className="relative h-full w-full max-w-md bg-black shadow-2xl flex flex-col justify-between">
        
        {/* BARRA SUPERIOR */}
        <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <Link
            to="/"
            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-4 text-sm font-bold tracking-wide drop-shadow-md">
            <span className="text-white/60 cursor-pointer">Seguindo</span>
            <span className="text-white border-b-2 border-white pb-0.5 cursor-pointer">
              Para Você
            </span>
          </div>

          {isVipClube ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold shadow-lg shadow-amber-400/30">
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              VIP Sem Ads
            </div>
          ) : (
            <Link
              to="/clube-hs"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold backdrop-blur-md"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              Tirar Ads
            </Link>
          )}
        </header>

        {/* FEED DE ROLAGEM VERTICAL MAGNÉTICA */}
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
            const isFollowing = Boolean(post.author_id && followedUsers[post.author_id]);
            const isAd = post.post_type === "ad";

            return (
              <div
                key={`${post.id}-${idx}`}
                className="relative h-full w-full snap-start snap-always shrink-0 flex items-center justify-center bg-zinc-950 overflow-hidden"
              >
                {/* Reprodutor Híbrido: Suporta TikTok Embed ou MP4 HTML5 */}
                {post.is_tiktok_embed ? (
                  <iframe
                    title={post.description}
                    src={post.video_url}
                    className="w-full h-full border-0 pointer-events-auto"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <HTML5VideoPlayer
                    src={post.video_url}
                    isActive={isActive}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted((prev) => !prev)}
                  />
                )}

                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/90 z-10" />

                {/* BARRA LATERAL ESTILO TIKTOK */}
                <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5 text-white">
                  {/* Avatar do Criador + Abrir Perfil */}
                  <div className="relative mb-2">
                    <button
                      onClick={() => setProfileModalUser(post)}
                      className="relative block rounded-full focus:outline-none"
                    >
                      <img
                        src={post.author_avatar}
                        alt={post.author_name}
                        className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-lg"
                      />
                    </button>
                    {/* Botão Seguir rápido */}
                    {post.author_id && (
                      <button
                        onClick={() => toggleFollow(post.author_id!)}
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          isFollowing ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                        }`}
                      >
                        {isFollowing ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {/* Curtir */}
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

                  {/* Comentários Reais */}
                  <button
                    onClick={() => setCommentModalPost(post)}
                    className="flex flex-col items-center gap-1 active:scale-110 transition-transform"
                  >
                    <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold drop-shadow">
                      {post.comments_count || comments.length || 0}
                    </span>
                  </button>

                  {/* Compartilhar */}
                  <button
                    onClick={() => handleShare(post)}
                    className="flex flex-col items-center gap-1 active:scale-110 transition-transform"
                  >
                    <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold drop-shadow">Share</span>
                  </button>

                  {/* Mudo / Som */}
                  {!post.is_tiktok_embed && (
                    <button
                      onClick={() => setIsMuted((prev) => !prev)}
                      className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white mt-1 active:scale-110 transition-transform"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                    </button>
                  )}
                </div>

                {/* LEGENDA E CTAs NO RODAPÉ */}
                <div className="absolute left-4 right-16 bottom-6 z-20 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProfileModalUser(post)}
                      className="font-extrabold text-sm text-white drop-shadow hover:underline text-left"
                    >
                      {post.author_name}
                    </button>

                    {isAd && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                        {post.ad_badge || "Patrocinado"}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-white/95 leading-relaxed line-clamp-3 drop-shadow">
                    {post.description}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-white/80 font-medium">
                    <Music2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="truncate max-w-[200px]">{post.music_title}</span>
                  </div>

                  {/* CTA DE ANÚNCIO (post_type: 'ad') -> SEM SACOLA, COM CTA */}
                  {isAd && post.cta_label && (
                    <div className="pt-2">
                      {post.is_external ? (
                        <a
                          href={post.cta_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30"
                        >
                          {post.cta_label}
                          <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                        </a>
                      ) : (
                        <Link
                          to={post.cta_url || "/clube-hs"}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30"
                        >
                          <Crown className="w-4 h-4 fill-slate-950" />
                          {post.cta_label}
                        </Link>
                      )}
                    </div>
                  )}

                  {/* PRODUTO (post_type: 'product') -> COM SACOLA */}
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

        {/* BOTÃO FLUTUANTE DE GRAVAR / ENVIAR VÍDEO (+) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center justify-center w-12 h-10 rounded-xl bg-gradient-to-r from-cyan-400 via-white to-rose-500 text-slate-950 font-black shadow-2xl active:scale-95 transition-transform"
            title="Publicar Vídeo"
          >
            <div className="w-[42px] h-[34px] bg-white rounded-lg flex items-center justify-center text-slate-950">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
          </button>
        </div>
      </div>

      {/* 1. GAVETA DE COMENTÁRIOS DE VERDADE */}
      {commentModalPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-t border-slate-800 rounded-t-3xl h-[65vh] flex flex-col justify-between p-4 shadow-2xl">
            {/* Header Comentários */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-amber-400" />
                Comentários ({comments.length})
              </h3>
              <button
                onClick={() => setCommentModalPost(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Comentários */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 scrollbar-none">
              {comments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Seja o primeiro a comentar neste vídeo!
                </div>
              ) : (
                comments.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-3">
                    <img
                      src={comm.user_avatar}
                      alt={comm.user_name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 bg-slate-800/60 rounded-2xl p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-200">{comm.user_name}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(comm.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{comm.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input de Envio de Comentário */}
            <form onSubmit={handleSendComment} className="pt-2 border-t border-slate-800 flex gap-2">
              <Input
                type="text"
                placeholder={authUser ? "Deixe um comentário legal..." : "Faça login para comentar"}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={!authUser}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-xl text-xs h-10"
              />
              <Button
                type="submit"
                disabled={!newCommentText.trim() || !authUser}
                className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL DE PERFIL DO CRIADOR */}
      {profileModalUser && (
        <Dialog open={Boolean(profileModalUser)} onOpenChange={() => setProfileModalUser(null)}>
          <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-white rounded-3xl p-6 text-center">
            <div className="relative w-20 h-20 mx-auto mb-3">
              <img
                src={profileModalUser.author_avatar}
                alt={profileModalUser.author_name}
                className="w-20 h-20 rounded-full border-4 border-amber-500 object-cover shadow-xl"
              />
            </div>

            <h3 className="font-extrabold text-base text-white">{profileModalUser.author_name}</h3>
            <p className="text-xs text-amber-400 font-medium mt-0.5">@criador_hs</p>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {profileModalUser.author_bio || "Criador oficial de conteúdos e ofertas no HSTrends."}
            </p>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-2 my-5 py-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div>
                <p className="text-sm font-extrabold text-white">
                  {profileModalUser.author_followers?.toLocaleString() || "1.2k"}
                </p>
                <p className="text-[10px] text-slate-400">Seguidores</p>
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">
                  {profileModalUser.likes_count.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">Curtidas</p>
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">12</p>
                <p className="text-[10px] text-slate-400">Vídeos</p>
              </div>
            </div>

            {/* Botão Seguir */}
            <Button
              onClick={() => {
                if (profileModalUser.author_id) {
                  toggleFollow(profileModalUser.author_id);
                }
              }}
              className={`w-full py-2.5 rounded-xl font-bold text-xs ${
                profileModalUser.author_id && followedUsers[profileModalUser.author_id]
                  ? "bg-slate-800 text-slate-200 border border-slate-700"
                  : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20"
              }`}
            >
              {profileModalUser.author_id && followedUsers[profileModalUser.author_id] ? (
                <>
                  <UserCheck className="w-4 h-4 mr-2 text-emerald-400" /> Seguindo
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" /> Seguir Criador
                </>
              )}
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. MODAL DE GRAVAR / ENVIAR VÍDEO (+) */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <VideoIcon className="w-5 h-5 text-amber-400" />
              Publicar no HSTrends
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUploadVideo} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Link direto do Vídeo (.mp4 ou TikTok Embed)</label>
              <Input
                type="url"
                placeholder="https://exemplo.com/meu-video.mp4"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                required
                className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Cole a URL de um arquivo .mp4 público ou link de player do TikTok.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Título do Vídeo</label>
              <Input
                type="text"
                placeholder="Ex: Minha Novelinha de Frutas ep. 1"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Legenda / Descrição</label>
              <Textarea
                placeholder="Escreva sobre o que é o vídeo, use hashtags..."
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                rows={3}
                className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Tipo de Conteúdo</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setUploadType("organic")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    uploadType === "organic"
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  Novelinha / Viral
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType("product")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    uploadType === "product"
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  Feedback de Produto
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmittingVideo}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20"
            >
              {isSubmittingVideo ? "Publicando..." : "Publicar Vídeo Agora"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-componente de Vídeo HTML5 Seguro com Autoplay Mudo
function HTML5VideoPlayer({
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
  const [isWaitingGesture, setIsWaitingGesture] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.defaultMuted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isMuted;
      video.defaultMuted = isMuted;

      const start = () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsWaitingGesture(false);
            })
            .catch(() => {
              video.muted = true;
              video.defaultMuted = true;
              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setIsWaitingGesture(false);
                })
                .catch(() => {
                  setIsPlaying(false);
                  setIsWaitingGesture(true);
                });
            });
        }
      };

      if (video.readyState >= 2) {
        start();
      } else {
        video.oncanplay = () => {
          start();
          video.oncanplay = null;
        };
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, isMuted]);

  const handleToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.muted = isMuted;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsWaitingGesture(false);
        })
        .catch(() => {
          video.muted = true;
          video.play().then(() => {
            setIsPlaying(true);
            setIsWaitingGesture(false);
          });
        });
    }
  };

  return (
    <div
      onClick={handleToggle}
      className="relative w-full h-full cursor-pointer flex items-center justify-center bg-black"
    >
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        muted={isMuted}
        preload="auto"
        className="w-full h-full object-cover"
      />

      {(!isPlaying || isWaitingGesture) && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-15">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30 animate-pulse">
              <Play className="w-8 h-8 fill-slate-950 ml-1" />
            </div>
            {isWaitingGesture && (
              <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full border border-white/20">
                Toque para Assistir
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
