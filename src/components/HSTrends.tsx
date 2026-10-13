import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const INITIAL_FEED: TrendPost[] = [
  {
    id: "tt-7689854727529549076",
    post_type: "organic",
    video_url: "https://tiktok.com",
    is_tiktok_embed: true,
    author_id: "hs-oficial",
    author_name: "HS Digital Oficial 🛒",
    author_avatar: "https://tiktokcdn.com",
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
    video_url: "https://mozilla.net",
    author_id: "novelas-frutas",
    author_name: "Novelinhas da Feira 🍊",
    author_avatar: "https://unsplash.com",
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
    video_url: "https://zencdn.net",
    author_id: "mari-reviews",
    author_name: "Mari Reviews 📦",
    author_avatar: "https://unsplash.com",
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
    video_url: "https://w3schools.com",
    author_id: "frutas-foco",
    author_name: "Frutas em Foco 🥑",
    author_avatar: "https://unsplash.com",
    author_bio: "Humor, receitas e comédia da feira livre.",
    author_followers: 15900,
    description: "O Abacate tentou assinar o Clube HS mas não achou o CPF dele 😂🥑 #Comedia #Hortifruti",
    music_title: "Risadas · Humor Trends",
    likes_count: 3190,
    comments_count: 114,
  },
];

const NATIVE_ADS: TrendPost[] = [
  {
    id: "ad-clube-hs",
    post_type: "ad",
    video_url: "https://mozilla.net",
    author_id: "hs-oficial",
    author_name: "HS Digital Oficial 🌟",
    author_avatar: "https://unsplash.com",
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
    video_url: "https://w3schools.com",
    author_id: "padaria-real",
    author_name: "Padaria Real de Perdizes 🥖",
    author_avatar: "https://unsplash.com",
    author_bio: "Tradição em pães de fermentação natural e confeitaria fina.",
    author_followers: 6800,
    description: "Pão artesanal quentinho saindo a toda hora. Peça delivery no bairro pelo nosso WhatsApp parceiro!",
    music_title: "Anúncio Comercial · Comércio Local",
    likes_count: 850,
    comments_count: 22,
    ad_badge: "Lojista Parceiro do Bairro",
    cta_label: "Fazer Pedido no WhatsApp",
    cta_url: "https://wa.me",
    is_external: true,
  },
];

export function HSTrends() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});

  const [commentModalPost, setCommentModalPost] = useState<TrendPost | null>(null);
  const [profileModalUser, setProfileModalUser] = useState<TrendPost | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [newCommentText, setNewCommentText] = useState("");

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"organic" | "product">("organic");
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);

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

  const { data: customVideos = [] } = useQuery({
    queryKey: ["trend-supabase-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trend_videos" as any)
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

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["trend-comments", commentModalPost?.id],
    queryFn: async () => {
      if (!commentModalPost?.id) return [];
      const { data, error } = await supabase
        .from("trend_comments" as any)
        .select("*")
        .eq("video_id", commentModalPost.id)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data as TrendComment[];
    },
    enabled: Boolean(commentModalPost?.id),
  });

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
      user_avatar: userProfile?.avatar_url || "https://unsplash.com",
      content: newCommentText.trim(),
    };

Use o código com cuidado.
const { error } = await supabase.from("trend_comments" as any).insert(commentData);
if (!error) {
setNewCommentText("");
refetchComments();
}
};
const handleFileChange = (e: React.ChangeEvent) => {
if (e.target.files && e.target.files[0]) {
setSelectedFile(e.target.files[0]);
}
};
const handleUploadVideo = async (e: React.FormEvent) => {
e.preventDefault();
if (!selectedFile || !uploadTitle.trim()) {
alert("Selecione um arquivo de vídeo da galeria/câmera e digite o título!");
return;
}
if (!authUser) {
alert("Faça login para postar vídeos no HSTrends!");
return;
}
setIsSubmittingVideo(true);
try {
const fileExt = selectedFile.name.split(".").pop();
const fileName = ${Math.random()}_${Date.now()}.${fileExt};
const filePath = user-trends/${fileName};
const { error: uploadError } = await (supabase.storage.from("hstrends-videos") as any).upload(filePath, selectedFile);
if (uploadError) throw uploadError;
const { data: urlData } = (supabase.storage.from("hstrends-videos") as any).getPublicUrl(filePath);
const newVideo = {
user_id: authUser.id,
author_name: userProfile?.full_name || authUser.email?.split("@")[0] || "Criador HS",
author_avatar: userProfile?.avatar_url || "unsplash.com",
title: uploadTitle.trim(),
description: uploadDesc.trim(),
video_url: urlData?.publicUrl || "",
post_type: uploadType,
music_title: "Som Original · " + (userProfile?.full_name || "Criador HS"),
};
const { error: dbError } = await supabase.from("trend_videos" as any).insert(newVideo);
if (dbError) throw dbError;
setUploadModalOpen(false);
setUploadTitle("");
setUploadDesc("");
setSelectedFile(null);
queryClient.invalidateQueries({ queryKey: ["trend-supabase-videos"] });
alert("Seu vídeo foi publicado com sucesso no HSTrends!");
} catch (error) {
console.error(error);
alert("Erro ao publicar vídeo. Verifique se o bucket 'hstrends-videos' está criado no seu Supabase.");
} finally {
setIsSubmittingVideo(false);
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

Seguindo

Para Você

{isVipClube ? (


VIP Sem Ads

) : (
Tirar Ads
)}
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
key={${post.id}-${idx}}
className="relative h-full w-full snap-start snap-always shrink-0 flex items-center justify-center bg-zinc-950 overflow-hidden"
>
{post.is_tiktok_embed ? (

) : (
<HTML5VideoPlayer
src={post.video_url}
isActive={isActive}
isMuted={isMuted}
onToggleMute={() => setIsMuted((prev) => !prev)}
/>
)}
<button
onClick={() => setProfileModalUser(post)}
className="relative block rounded-full focus:outline-none"
>


{post.author_id && (
<button
onClick={() => toggleFollow(post.author_id!)}
className={absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center transition-all ${ isFollowing ? "bg-emerald-500 text-white" : "bg-rose-500 text-white" }}
>
{isFollowing ?  : }

)}
<button
onClick={() => toggleLike(post.id)}
className="flex flex-col items-center gap-1 group active:scale-125 transition-transform"
>
<div
className={p-2.5 rounded-full backdrop-blur-md transition-colors ${ isLiked ? "bg-rose-600/30 text-rose-500" : "bg-black/40 text-white" }}
>
<Heart className={w-6 h-6 ${isLiked ? "fill-rose-500" : ""}} />


{isLiked ? post.likes_count + 1 : post.likes_count}

<button
onClick={() => setCommentModalPost(post)}
className="flex flex-col items-center gap-1 active:scale-110 transition-transform"
>




{post.comments_count || comments.length || 0}

<button
onClick={() => handleShare(post)}
className="flex flex-col items-center gap-1 active:scale-110 transition-transform"
>



Share
{!post.is_tiktok_embed && (
<button
onClick={() => setIsMuted((prev) => !prev)}
className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white mt-1 active:scale-110 transition-transform"
>
{isMuted ?  : }

)}
<button
onClick={() => setProfileModalUser(post)}
className="font-extrabold text-sm text-white drop-shadow hover:underline text-left"
>
{post.author_name}
{isAd && (

{post.ad_badge || "Patrocinado"}

)}
{post.description}
{post.music_title}
{isAd && post.cta_label && (

{post.is_external ? (
<a
href={post.cta_url || "#"}
target="_blank"
rel="noopener noreferrer"
className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30"
>
{post.cta_label}


) : (
{post.cta_label}
)}

)}
{!isAd && post.product_id && (

{post.product_price && (
)}
)}


);
})}
<button
onClick={() => setUploadModalOpen(true)}
className="flex items-center justify-center w-12 h-10 rounded-xl bg-gradient-to-r from-cyan-400 via-white to-rose-500 text-slate-950 font-black shadow-2xl active:scale-95 transition-transform"
title="Publicar Vídeo"
>





{commentModalPost && (





Comentários ({comments.length})

<button
onClick={() => setCommentModalPost(null)}
className="p-1 rounded-full text-slate-400 hover:text-white"
>


{comments.length === 0 ? (

Seja o primeiro a comentar neste vídeo!

) : (
comments.map((comm) => (




{comm.user_name}

{new Date(comm.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}


{comm.content}


))
)}
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





)}
{profileModalUser && (
<Dialog open={Boolean(profileModalUser)} onOpenChange={() => setProfileModalUser(null)}>



{profileModalUser.author_name}
@criador_hs
{profileModalUser.author_bio || "Criador oficial de conteúdos e ofertas no HSTrends."}
{profileModalUser.author_followers?.toLocaleString() || "1.2k"}

Seguidores



{profileModalUser.likes_count.toLocaleString()}

Curtidas


12
Vídeos

<Button
onClick={() => {
if (profileModalUser.author_id) {
toggleFollow(profileModalUser.author_id);
}
}}
className={w-full py-2.5 rounded-xl font-bold text-xs ${ profileModalUser.author_id && followedUsers[profileModalUser.author_id] ? "bg-slate-800 text-slate-200 border border-slate-700" : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20" }}
>
{profileModalUser.author_id && followedUsers[profileModalUser.author_id] ? (
<>
 Seguindo
</>
) : (
<>
 Seguir Criador
</>
)}



)}
Publicar no HSTrends

Escolha o seu Vídeo
<div
onClick={() => fileInputRef.current?.click()}
className="mt-1.5 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-6 bg-slate-950 cursor-pointer hover:border-amber-500 transition-colors"
>


{selectedFile ? selectedFile.name : "Clique para abrir Câmera ou Galeria"}

Apenas arquivos de vídeo (.mp4, .mov, etc)
Título do Vídeo
<Input
type="text"
placeholder="Ex: Minha Novelinha de Frutas ep. 1"
value={uploadTitle}
onChange={(e) => setUploadTitle(e.target.value)}
required
className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl"
/>
Legenda / Descrição
<Textarea
placeholder="Escreva sobre o que é o vídeo, use hashtags..."
value={uploadDesc}
onChange={(e) => setUploadDesc(e.target.value)}
rows={3}
className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl resize-none"
/>
Tipo de Conteúdo
<button
type="button"
onClick={() => setUploadType("organic")}
className={py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${ uploadType === "organic" ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-950 text-slate-400 border-slate-800" }}
>
Novelinha / Viral

<button
type="button"
onClick={() => setUploadType("product")}
className={py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${ uploadType === "product" ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-950 text-slate-400 border-slate-800" }}
>
Feedback de Produto


{isSubmittingVideo ? "Enviando arquivo..." : "Publicar Vídeo Agora"}





);
}
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
{(!isPlaying || isWaitingGesture) && isActive && (





{isWaitingGesture && (

Toque para Assistir

)}


)}

);
}
