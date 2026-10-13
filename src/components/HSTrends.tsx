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

