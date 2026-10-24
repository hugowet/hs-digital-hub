// @ts-nocheck -- types out of sync with backend schema; see build log
import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
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
  Video as VideoIcon,
  Radio,
  Gamepad2,
  MessagesSquare,
  Tag,
  Camera,
  BadgeCheck,
  Eye,
  Pencil,
  Trash2,
  CornerDownRight,
  Library,
} from "lucide-react";
import { TREND_MUSIC_LIBRARY, type TrendMusicTrack } from "@/lib/trends-music";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const MAX_VIDEO_SECONDS = 120;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const SIGNED_URL_TTL = 3600;

export type TrendPost = {
  id: string;
  post_type: "organic" | "ad" | "photo";
  video_url: string;
  audio_url?: string;
  author_id?: string;
  author_name: string;
  author_avatar: string;
  author_bio?: string;
  author_status?: string;
  description: string;
  music_title: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  title?: string;
  ad_badge?: string;
  ad_icon?: "radio" | "clube" | "jogos" | "social" | "promo";
  cta_label?: string;
  cta_url?: string;
};

export type TrendComment = {
  id: string;
  video_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
  parent_id?: string | null;
  edited_at?: string | null;
};

// Anúncios internos da plataforma (aparecem só para quem não é Clube HS)
const NATIVE_ADS: TrendPost[] = [
  {
    id: "ad-clube-hs",
    post_type: "ad",
    video_url: "",
    author_name: "HS Digital Oficial 🌟",
    author_avatar: "",
    description: "Assine o Clube HS: poste vídeos no HSTrends, frete grátis e vantagens exclusivas por R$ 19,90/mês!",
    music_title: "Comercial Oficial · Clube HS",
    likes_count: 0,
    comments_count: 0,
    ad_badge: "Clube HS",
    ad_icon: "clube",
    cta_label: "Assinar Clube HS",
    cta_url: "/clube-hs",
  },
  {
    id: "ad-radio-hs",
    post_type: "ad",
    video_url: "",
    author_name: "Rádio HS 🎧",
    author_avatar: "",
    description: "A trilha sonora das suas compras! Ouça a Rádio HS com as mais tocadas, direto na vitrine.",
    music_title: "Comercial · Rádio HS",
    likes_count: 0,
    comments_count: 0,
    ad_badge: "Rádio HS",
    ad_icon: "radio",
    cta_label: "Ouvir Rádio HS",
    cta_url: "/radio",
  },
  {
    id: "ad-jogos",
    post_type: "ad",
    video_url: "",
    author_name: "Jogos & Prêmios 🎮",
    author_avatar: "",
    description: "Roleta, raspadinha, cobrinha e arcade! Junte moedas e troque por cupons de desconto e frete.",
    music_title: "Comercial · Jogos & Prêmios",
    likes_count: 0,
    comments_count: 0,
    ad_badge: "Jogos & Prêmios",
    ad_icon: "jogos",
    cta_label: "Jogar Agora",
    cta_url: "/jogos",
  },
  {
    id: "ad-social",
    post_type: "ad",
    video_url: "",
    author_name: "HS Social 💬",
    author_avatar: "",
    description: "Converse com quem você conhece pelo número cadastrado e publique stories de 24 horas.",
    music_title: "Comercial · HS Social",
    likes_count: 0,
    comments_count: 0,
    ad_badge: "HS Social",
    ad_icon: "social",
    cta_label: "Abrir HS Social",
    cta_url: "/social",
  },
  {
    id: "ad-promo",
    post_type: "ad",
    video_url: "",
    author_name: "HS Digital 🛒",
    author_avatar: "",
    description: "Ofertas com até 71% OFF e frete grátis a partir de R$ 89,90. Corre pra vitrine!",
    music_title: "Comercial · Ofertas da Vitrine",
    likes_count: 0,
    comments_count: 0,
    ad_badge: "Promoções",
    ad_icon: "promo",
    cta_label: "Ver Ofertas",
    cta_url: "/",
  },
];

const AD_ICONS = {
  radio: Radio,
  clube: Crown,
  jogos: Gamepad2,
  social: MessagesSquare,
  promo: Tag,
} as const;

type Badge = { label: string; className: string } | null;

export function getCreatorBadge(followers: number): Badge {
  if (followers >= 10000) return { label: "Lenda HS", className: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/50" };
  if (followers >= 5000) return { label: "Diamante", className: "bg-cyan-500/20 text-cyan-300 border-cyan-400/50" };
  if (followers >= 2000) return { label: "Ouro", className: "bg-amber-500/20 text-amber-300 border-amber-400/50" };
  if (followers >= 1000) return { label: "Prata", className: "bg-slate-400/20 text-slate-200 border-slate-300/50" };
  if (followers >= 500) return { label: "Bronze", className: "bg-orange-700/20 text-orange-300 border-orange-500/50" };
  return null;
}

const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80";

export function HSTrends() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Navegadores bloqueiam autoplay com som: liga o áudio no primeiro toque/clique do usuário
  useEffect(() => {
    const unlock = () => setIsMuted(false);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const [commentModalPost, setCommentModalPost] = useState<TrendPost | null>(null);
  const [profileModalUser, setProfileModalUser] = useState<TrendPost | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const [newCommentText, setNewCommentText] = useState("");

  // Upload de vídeo ou foto
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState<"video" | "photo">("video");
  const [uploadDuration, setUploadDuration] = useState(0);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [libraryTrack, setLibraryTrack] = useState<TrendMusicTrack | null>(null);
  const [musicTab, setMusicTab] = useState<"library" | "device">("library");
  const [replyToComment, setReplyToComment] = useState<TrendComment | null>(null);
  const [editingComment, setEditingComment] = useState<TrendComment | null>(null);
  const [editPostTarget, setEditPostTarget] = useState<TrendPost | null>(null);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostDesc, setEditPostDesc] = useState("");
  const viewedPostsRef = useRef<Set<string>>(new Set());
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const musicInputRef = useRef<HTMLInputElement | null>(null);

  // Edição de perfil
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const { data: authUser } = useQuery({
    queryKey: ["trend-current-auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["hstrends-user-clube-status", authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("is_clube_hs, full_name, avatar_url, bio, status_text")
        .eq("id", authUser.id)
        .maybeSingle();
      return data;
    },
    enabled: Boolean(authUser?.id),
  });

  const isVipClube = Boolean(userProfile?.is_clube_hs);
  // Administrador tem HSTrends ilimitado (pode postar sem assinatura)
  const isAdmin = authUser?.email === "hugoet373@gmail.com";
  const canPostVideos = isVipClube || isAdmin;

  // Vídeos reais do banco + URLs assinadas
  const { data: customVideos = [] } = useQuery({
    queryKey: ["trend-supabase-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trend_videos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error || !data) return [];

      const paths = data.map((v: any) => v.video_url).filter((p: string) => p && !p.startsWith("http"));
      const audioPaths = data.map((v: any) => v.audio_path).filter((p: string) => p && !p.startsWith("http"));
      const signed: Record<string, string> = {};
      const allPaths = [...paths, ...audioPaths];
      if (allPaths.length) {
        const { data: urls } = await supabase.storage.from("trend-videos").createSignedUrls(allPaths, SIGNED_URL_TTL);
        for (const entry of urls ?? []) {
          if (entry.path && entry.signedUrl) signed[entry.path] = entry.signedUrl;
        }
      }

      return data.map((v: any) => ({
        id: v.id,
        post_type: v.post_type === "photo" ? "photo" : "organic",
        video_url: v.video_url.startsWith("http") ? v.video_url : signed[v.video_url] ?? "",
        audio_url: v.audio_path ? (v.audio_path.startsWith("http") ? v.audio_path : signed[v.audio_path] ?? "") : "",
        author_id: v.user_id,
        author_name: v.author_name,
        author_avatar: v.author_avatar || FALLBACK_AVATAR,
        description: v.description || v.title,
        music_title: v.music_title || "Som Original",
        likes_count: v.likes_count || 0,
        comments_count: 0,
        views_count: v.views_count || 0,
        title: v.title,
      })) as TrendPost[];
    },
    refetchInterval: 60_000,
  });

  // Curtidas do usuário logado
  const { data: myLikes = [] } = useQuery({
    queryKey: ["trend-my-likes", authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return [];
      const { data } = await supabase.from("trend_likes").select("video_id").eq("user_id", authUser.id);
      return (data ?? []).map((r: any) => r.video_id as string);
    },
    enabled: Boolean(authUser?.id),
  });

  // Quem o usuário segue
  const { data: myFollows = [] } = useQuery({
    queryKey: ["trend-my-follows", authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return [];
      const { data } = await supabase.from("trend_follows").select("followed_id").eq("follower_id", authUser.id);
      return (data ?? []).map((r: any) => r.followed_id as string);
    },
    enabled: Boolean(authUser?.id),
  });

  // Seguidores por autor (para selos e contadores)
  const authorIds = useMemo(
    () => [...new Set(customVideos.map((v) => v.author_id).filter(Boolean))] as string[],
    [customVideos],
  );
  const { data: followerCounts = {} } = useQuery({
    queryKey: ["trend-follower-counts", authorIds.join(",")],
    queryFn: async () => {
      if (!authorIds.length) return {};
      const { data } = await supabase.from("trend_follows").select("followed_id").in("followed_id", authorIds);
      const counts: Record<string, number> = {};
      for (const row of data ?? []) counts[row.followed_id] = (counts[row.followed_id] ?? 0) + 1;
      return counts;
    },
    enabled: authorIds.length > 0,
  });

  // Perfis dos autores (bio/status)
  const { data: authorProfiles = {} } = useQuery({
    queryKey: ["trend-author-profiles", authorIds.join(",")],
    queryFn: async () => {
      if (!authorIds.length) return {};
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url, bio, status_text").in("id", authorIds);
      const map: Record<string, any> = {};
      for (const p of data ?? []) map[p.id] = p;
      return map;
    },
    enabled: authorIds.length > 0,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["trend-comments", commentModalPost?.id],
    queryFn: async () => {
      if (!commentModalPost?.id) return [];
      const { data, error } = await supabase
        .from("trend_comments")
        .select("*")
        .eq("video_id", commentModalPost.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error || !data) return [];
      return data as TrendComment[];
    },
    enabled: Boolean(commentModalPost?.id),
  });

  // 1 anúncio a cada 4 vídeos; assinantes Clube HS não veem anúncios
  const processedFeed = useMemo(() => {
    if (isVipClube) return customVideos;
    const result: TrendPost[] = [];
    let adPointer = 0;
    for (let i = 0; i < customVideos.length; i++) {
      result.push(customVideos[i]);
      if ((i + 1) % 4 === 0) {
        result.push(NATIVE_ADS[adPointer % NATIVE_ADS.length]);
        adPointer++;
      }
    }
    if (customVideos.length === 0) result.push(NATIVE_ADS[0]);
    return result;
  }, [customVideos, isVipClube]);

  const requireLogin = (action: string) => {
    toast.info(`Faça login para ${action}.`);
    navigate({ to: "/auth", search: { reason: "login-required" } });
  };

  // Visualização real: registra 1 view por usuário quando o post fica visível
  const activePost = processedFeed[currentIndex];
  useEffect(() => {
    if (!activePost || activePost.post_type === "ad" || !authUser?.id) return;
    if (viewedPostsRef.current.has(activePost.id)) return;
    viewedPostsRef.current.add(activePost.id);
    void supabase.rpc("trend_register_view", { _video_id: activePost.id }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["trend-supabase-videos"] });
    });
  }, [activePost?.id, authUser?.id, queryClient]);

  const canManagePost = (post: TrendPost) =>
    Boolean(authUser && post.author_id && (post.author_id === authUser.id || isAdmin));

  const handleDeletePost = async (post: TrendPost) => {
    if (!authUser || !canManagePost(post)) return;
    if (!window.confirm("Apagar este post do HSTrends? Essa ação não pode ser desfeita.")) return;
    const { data: row } = await supabase.from("trend_videos").select("video_url, audio_path").eq("id", post.id).single();
    const { error } = await supabase.from("trend_videos").delete().eq("id", post.id);
    if (error) {
      toast.error("Não foi possível apagar o post.");
      return;
    }
    const paths = [row?.video_url, row?.audio_path].filter((p): p is string => Boolean(p) && !p!.startsWith("http"));
    if (paths.length) await supabase.storage.from("trend-videos").remove(paths);
    queryClient.invalidateQueries({ queryKey: ["trend-supabase-videos"] });
    toast.success("Post apagado.");
  };

  const openEditPost = (post: TrendPost) => {
    setEditPostTitle(post.title || "");
    setEditPostDesc(post.description || "");
    setEditPostTarget(post);
  };

  const handleSaveEditedPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPostTarget || !authUser) return;
    const { error } = await supabase
      .from("trend_videos")
      .update({ title: editPostTitle.trim(), description: editPostDesc.trim() })
      .eq("id", editPostTarget.id);
    if (error) {
      toast.error("Não foi possível salvar as alterações.");
      return;
    }
    setEditPostTarget(null);
    queryClient.invalidateQueries({ queryKey: ["trend-supabase-videos"] });
    toast.success("Post atualizado!");
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("trend_comments").delete().eq("id", commentId);
    if (error) toast.error("Não foi possível apagar o comentário.");
    else refetchComments();
  };

  const handleSaveEditedComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComment || !newCommentText.trim()) return;
    const { error } = await supabase
      .from("trend_comments")
      .update({ content: newCommentText.trim(), edited_at: new Date().toISOString() })
      .eq("id", editingComment.id);
    if (error) toast.error("Não foi possível editar o comentário.");
    else {
      setEditingComment(null);
      setNewCommentText("");
      refetchComments();
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !commentModalPost) return;
    if (!authUser) return requireLogin("comentar");

    const { error } = await supabase.from("trend_comments").insert({
      video_id: commentModalPost.id,
      user_id: authUser.id,
      user_name: userProfile?.full_name || authUser.email?.split("@")[0] || "Cliente HS",
      user_avatar: userProfile?.avatar_url || FALLBACK_AVATAR,
      content: newCommentText.trim(),
      parent_id: replyToComment?.id ?? null,
    });
    if (error) toast.error("Não foi possível enviar o comentário.");
    else {
      setNewCommentText("");
      setReplyToComment(null);
      refetchComments();
    }
  };

  const toggleLike = async (post: TrendPost) => {
    if (post.post_type === "ad") return;
    if (!authUser) return requireLogin("curtir");
    const liked = myLikes.includes(post.id);
    if (liked) {
      await supabase.from("trend_likes").delete().eq("video_id", post.id).eq("user_id", authUser.id);
    } else {
      await supabase.from("trend_likes").insert({ video_id: post.id, user_id: authUser.id });
    }
    queryClient.invalidateQueries({ queryKey: ["trend-my-likes", authUser.id] });
    queryClient.invalidateQueries({ queryKey: ["trend-supabase-videos"] });
  };

  const toggleFollow = async (authorId: string) => {
    if (!authUser) return requireLogin("seguir criadores");
    if (authorId === authUser.id) return;
    const following = myFollows.includes(authorId);
    if (following) {
      await supabase.from("trend_follows").delete().eq("follower_id", authUser.id).eq("followed_id", authorId);
    } else {
      await supabase.from("trend_follows").insert({ follower_id: authUser.id, followed_id: authorId });
    }
    queryClient.invalidateQueries({ queryKey: ["trend-my-follows", authUser.id] });
    queryClient.invalidateQueries({ queryKey: ["trend-follower-counts"] });
  };

  // Seleção de vídeo (máx. 2 min) ou foto da galeria
  const handlePickVideo = (file: File | null) => {
    if (!file) return;
    if (file.type.startsWith("image/")) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("A foto deve ter no máximo 20 MB.");
        return;
      }
      setUploadKind("photo");
      setUploadDuration(0);
      setUploadFile(file);
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um vídeo ou uma foto.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("O vídeo deve ter no máximo 200 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (probe.duration > MAX_VIDEO_SECONDS) {
        toast.error("O vídeo deve ter no máximo 2 minutos.");
        return;
      }
      setUploadKind("video");
      setUploadDuration(Math.round(probe.duration));
      setUploadFile(file);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Não foi possível ler este vídeo.");
    };
    probe.src = url;
  };

  const handlePickMusic = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("Selecione um arquivo de áudio (MP3, etc).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("A música deve ter no máximo 20 MB.");
      return;
    }
    setMusicFile(file);
  };

  const handleOpenUpload = () => {
    if (!authUser) return requireLogin("postar vídeos");
    if (!canPostVideos) {
      toast.info("Postar no HSTrends é exclusivo do Clube HS.");
      navigate({ to: "/clube-hs" });
      return;
    }
    setUploadModalOpen(true);
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !canPostVideos) return;
    if (!uploadFile || !uploadTitle.trim()) {
      toast.error("Escolha um vídeo da galeria e escreva um título.");
      return;
    }
    setIsSubmittingVideo(true);
    try {
      const ext = uploadFile.name.split(".").pop() || (uploadKind === "photo" ? "jpg" : "mp4");
      const path = `${authUser.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upError } = await supabase.storage.from("trend-videos").upload(path, uploadFile, {
        contentType: uploadFile.type,
      });
      if (upError) throw new Error("Não foi possível enviar a mídia. Tente novamente.");

      let audioPath: string | null = null;
      if (libraryTrack) {
        // Música da biblioteca HS: usa a URL pública diretamente
        audioPath = libraryTrack.url;
      } else if (musicFile) {
        const audioExt = musicFile.name.split(".").pop() || "mp3";
        audioPath = `${authUser.id}/music-${crypto.randomUUID()}.${audioExt}`;
        const { error: musicError } = await supabase.storage.from("trend-videos").upload(audioPath, musicFile, {
          contentType: musicFile.type,
        });
        if (musicError) throw new Error("Não foi possível enviar a música. Tente novamente.");
      }

      const { error } = await supabase.from("trend_videos").insert({
        user_id: authUser.id,
        author_name: userProfile?.full_name || authUser.email?.split("@")[0] || "Criador HS",
        author_avatar: userProfile?.avatar_url || FALLBACK_AVATAR,
        title: uploadTitle.trim(),
        description: uploadDesc.trim(),
        video_url: path,
        audio_path: audioPath,
        duration_seconds: uploadDuration,
        post_type: uploadKind === "photo" ? "photo" : "organic",
        music_title: libraryTrack
          ? `🎵 ${libraryTrack.title} · ${libraryTrack.artist}`
          : musicFile
            ? `🎵 ${musicFile.name.replace(/\.[^.]+$/, "")}`
            : "Som Original · " + (userProfile?.full_name || "Criador HS"),
      });
      if (error) throw new Error("Não foi possível publicar o post.");

      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadKind("video");
      setUploadTitle("");
      setUploadDesc("");
      setMusicFile(null);
      setLibraryTrack(null);
      queryClient.invalidateQueries({ queryKey: ["trend-supabase-videos"] });
      toast.success("Seu post foi publicado no HSTrends!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar vídeo.");
    } finally {
      setIsSubmittingVideo(false);
    }
  };

  const openEditProfile = () => {
    setEditName(userProfile?.full_name || "");
    setEditBio(userProfile?.bio || "");
    setEditStatus(userProfile?.status_text || "");
    setEditAvatarFile(null);
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    setIsSavingProfile(true);
    try {
      let avatarUrl = userProfile?.avatar_url || null;
      if (editAvatarFile) {
        if (!editAvatarFile.type.startsWith("image/") || editAvatarFile.size > 5 * 1024 * 1024) {
          throw new Error("A foto de perfil deve ser uma imagem de até 5 MB.");
        }
        const ext = editAvatarFile.name.split(".").pop() || "jpg";
        const path = `${authUser.id}/avatar-${Date.now()}.${ext}`;
        const { error: upError } = await supabase.storage.from("trend-videos").upload(path, editAvatarFile);
        if (upError) throw new Error("Não foi possível enviar a foto.");
        const { data: signed } = await supabase.storage.from("trend-videos").createSignedUrl(path, 60 * 60 * 24 * 365);
        avatarUrl = signed?.signedUrl ?? null;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName.trim() || null, bio: editBio.trim(), status_text: editStatus.trim(), avatar_url: avatarUrl })
        .eq("id", authUser.id);
      if (error) throw new Error("Não foi possível salvar o perfil.");
      setEditProfileOpen(false);
      refetchProfile();
      toast.success("Perfil atualizado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleShare = (post: TrendPost) => {
    if (navigator.share) {
      navigator.share({ title: post.author_name, text: post.description, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para compartilhar!");
    }
  };

  const myFollowersCount = authUser ? (followerCounts[authUser.id] ?? 0) : 0;
  const myBadge = getCreatorBadge(myFollowersCount);

  return (
    <div className="relative h-screen w-full bg-black text-white flex justify-center overflow-hidden font-sans select-none">
      <div className="relative h-full w-full max-w-md bg-black shadow-2xl flex flex-col justify-between">
        {/* BARRA SUPERIOR */}
        <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <Link to="/" className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-2 text-sm font-bold tracking-wide drop-shadow-md">
            <span className="text-white border-b-2 border-white pb-0.5">Para Você</span>
            {myBadge && (
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${myBadge.className}`}>
                {myBadge.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {authUser && (
              <button
                onClick={openEditProfile}
                className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60"
                title="Editar meu perfil"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            {canPostVideos ? (
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
          </div>
        </header>

        {/* FEED VERTICAL */}
        <div
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
          onScroll={(e) => {
            const container = e.currentTarget;
            const index = Math.round(container.scrollTop / container.clientHeight);
            if (index !== currentIndex && index >= 0 && index < processedFeed.length) setCurrentIndex(index);
          }}
        >
          {processedFeed.length === 0 && (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center px-8">
              <VideoIcon className="w-12 h-12 text-slate-600" />
              <p className="text-sm text-slate-400">Nenhum vídeo publicado ainda. Assine o Clube HS e seja o primeiro a postar!</p>
              <Link to="/clube-hs" className="text-amber-400 font-bold text-sm underline">Conhecer o Clube HS</Link>
            </div>
          )}

          {processedFeed.map((post, idx) => {
            const isActive = idx === currentIndex;
            const isLiked = myLikes.includes(post.id);
            const isFollowing = Boolean(post.author_id && myFollows.includes(post.author_id));
            const isAd = post.post_type === "ad";
            const followers = post.author_id ? (followerCounts[post.author_id] ?? 0) : 0;
            const badge = getCreatorBadge(followers);
            const AdIcon = post.ad_icon ? AD_ICONS[post.ad_icon] : Tag;

            return (
              <div
                key={`${post.id}-${idx}`}
                className="relative h-full w-full snap-start snap-always shrink-0 flex items-center justify-center bg-zinc-950 overflow-hidden"
              >
                {isAd ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-950 via-slate-900 to-black px-8 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
                      <AdIcon className="w-10 h-10 text-amber-400" />
                    </div>
                    <p className="text-lg font-extrabold text-white">{post.ad_badge}</p>
                    <p className="text-sm text-slate-300 leading-relaxed max-w-xs">{post.description}</p>
                  </div>
                ) : post.post_type === "photo" ? (
                  <>
                    <img src={post.video_url} alt={post.description} className="absolute inset-0 w-full h-full object-cover" />
                    {isActive && post.audio_url && <audio src={post.audio_url} autoPlay loop />}
                  </>
                ) : (
                  <>
                    <HTML5VideoPlayer
                      src={post.video_url}
                      isActive={isActive}
                      isMuted={isMuted || Boolean(post.audio_url)}
                      onToggleMute={() => setIsMuted((prev) => !prev)}
                    />
                    {isActive && post.audio_url && <audio src={post.audio_url} autoPlay loop muted={isMuted} />}
                  </>
                )}

                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/90 z-10" />

                {/* BARRA LATERAL */}
                <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5 text-white">
                  {!isAd && post.author_id && (
                    <div className="relative mb-2">
                      <button onClick={() => setProfileModalUser(post)} className="relative block rounded-full focus:outline-none">
                        <img
                          src={(post.author_id && authorProfiles[post.author_id]?.avatar_url) || post.author_avatar || FALLBACK_AVATAR}
                          alt={post.author_name}
                          className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-lg"
                        />
                      </button>
                      {post.author_id !== authUser?.id && (
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
                  )}

                  {!isAd && (
                    <>
                      <button onClick={() => toggleLike(post)} className="flex flex-col items-center gap-1 group active:scale-125 transition-transform">
                        <div className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${isLiked ? "bg-rose-600/30 text-rose-500" : "bg-black/40 text-white"}`}>
                          <Heart className={`w-6 h-6 ${isLiked ? "fill-rose-500" : ""}`} />
                        </div>
                        <span className="text-[11px] font-bold drop-shadow">{post.likes_count}</span>
                      </button>

                      <button onClick={() => setCommentModalPost(post)} className="flex flex-col items-center gap-1 active:scale-110 transition-transform">
                        <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
                          <MessageCircle className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold drop-shadow">{comments.length || ""}</span>
                      </button>
                    </>
                  )}

                  <button onClick={() => handleShare(post)} className="flex flex-col items-center gap-1 active:scale-110 transition-transform">
                    <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold drop-shadow">Share</span>
                  </button>

                  {!isAd && (
                    <button onClick={() => setIsMuted((prev) => !prev)} className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white mt-1 active:scale-110 transition-transform">
                      {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                    </button>
                  )}
                </div>

                {/* LEGENDA E CTA */}
                <div className="absolute left-4 right-16 bottom-6 z-20 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => !isAd && setProfileModalUser(post)}
                      className="font-extrabold text-sm text-white drop-shadow hover:underline text-left"
                    >
                      {post.author_name}
                    </button>
                    {badge && !isAd && (
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                    {isAd && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                        {post.ad_badge || "Patrocinado"}
                      </span>
                    )}
                  </div>

                  {!isAd && (
                    <>
                      <p className="text-xs text-white/95 leading-relaxed line-clamp-3 drop-shadow">{post.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-white/80 font-medium">
                        <Music2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="truncate max-w-[200px]">{post.music_title}</span>
                      </div>
                    </>
                  )}

                  {isAd && post.cta_label && (
                    <div className="pt-2">
                      <Link
                        to={post.cta_url || "/"}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30"
                      >
                        <Crown className="w-4 h-4 fill-slate-950" />
                        {post.cta_label}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTÃO DE PUBLICAR (+) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={handleOpenUpload}
            className="flex items-center justify-center w-12 h-10 rounded-xl bg-gradient-to-r from-cyan-400 via-white to-rose-500 text-slate-950 font-black shadow-2xl active:scale-95 transition-transform"
            title="Publicar Vídeo"
          >
            <div className="w-[42px] h-[34px] bg-white rounded-lg flex items-center justify-center text-slate-950">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
          </button>
        </div>
      </div>

      {/* COMENTÁRIOS */}
      {commentModalPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-t border-slate-800 rounded-t-3xl h-[65vh] flex flex-col justify-between p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-amber-400" />
                Comentários ({comments.length})
              </h3>
              <button onClick={() => setCommentModalPost(null)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 scrollbar-none">
              {comments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">Seja o primeiro a comentar neste vídeo!</div>
              ) : (
                comments.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-3">
                    <img src={comm.user_avatar || FALLBACK_AVATAR} alt={comm.user_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
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

            <form onSubmit={handleSendComment} className="pt-2 border-t border-slate-800 flex gap-2">
              <Input
                type="text"
                placeholder={authUser ? "Deixe um comentário legal..." : "Faça login para comentar"}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={!authUser}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-xl text-xs h-10"
              />
              <Button type="submit" disabled={!newCommentText.trim() || !authUser} className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* PERFIL DO CRIADOR */}
      {profileModalUser && (
        <Dialog open={Boolean(profileModalUser)} onOpenChange={() => setProfileModalUser(null)}>
          <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-white rounded-3xl p-6 text-center">
            {(() => {
              const authorId = profileModalUser.author_id;
              const profile = authorId ? authorProfiles[authorId] : null;
              const followers = authorId ? (followerCounts[authorId] ?? 0) : 0;
              const badge = getCreatorBadge(followers);
              const videosCount = customVideos.filter((v) => v.author_id === authorId).length;
              const totalLikes = customVideos
                .filter((v) => v.author_id === authorId)
                .reduce((sum, v) => sum + (v.likes_count || 0), 0);
              return (
                <>
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <img
                      src={profile?.avatar_url || profileModalUser.author_avatar || FALLBACK_AVATAR}
                      alt={profileModalUser.author_name}
                      className="w-20 h-20 rounded-full border-4 border-amber-500 object-cover shadow-xl"
                    />
                  </div>

                  <h3 className="font-extrabold text-base text-white flex items-center justify-center gap-1.5">
                    {profile?.full_name || profileModalUser.author_name}
                    {badge && <BadgeCheck className="w-4 h-4 text-amber-400" />}
                  </h3>
                  {badge && (
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold ${badge.className}`}>
                      Conta {badge.label}
                    </span>
                  )}
                  {(profile?.status_text || "") && (
                    <p className="text-xs text-amber-400 font-medium mt-1.5">{profile.status_text}</p>
                  )}
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {profile?.bio || "Criador de conteúdo no HSTrends."}
                  </p>

                  <div className="grid grid-cols-3 gap-2 my-5 py-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div>
                      <p className="text-sm font-extrabold text-white">{followers.toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-slate-400">Seguidores</p>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-white">{totalLikes.toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-slate-400">Curtidas</p>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-white">{videosCount}</p>
                      <p className="text-[10px] text-slate-400">Vídeos</p>
                    </div>
                  </div>

                  {authorId && authorId !== authUser?.id && (
                    <Button
                      onClick={() => toggleFollow(authorId)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs ${
                        myFollows.includes(authorId)
                          ? "bg-slate-800 text-slate-200 border border-slate-700"
                          : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20"
                      }`}
                    >
                      {myFollows.includes(authorId) ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2 text-emerald-400" /> Seguindo
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" /> Seguir Criador
                        </>
                      )}
                    </Button>
                  )}
                  {authorId && authorId === authUser?.id && (
                    <Button onClick={openEditProfile} className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-200 border border-slate-700">
                      Editar Meu Perfil
                    </Button>
                  )}
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* PUBLICAR VÍDEO (só Clube HS) */}
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
              <label className="text-xs font-semibold text-slate-300">Vídeo (máx. 2 min) ou foto da galeria</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                className="hidden"
                onChange={(e) => handlePickVideo(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 w-full py-6 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 text-slate-400 text-xs font-bold flex flex-col items-center gap-2 hover:border-amber-500/60 hover:text-amber-300 transition-colors"
              >
                <VideoIcon className="w-6 h-6" />
                {uploadFile
                  ? uploadKind === "photo"
                    ? `📷 ${uploadFile.name}`
                    : `${uploadFile.name} · ${uploadDuration}s`
                  : "Toque para abrir a galeria"}
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Música (opcional)</label>
              <input
                ref={musicInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handlePickMusic(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => musicInputRef.current?.click()}
                className="mt-1 w-full py-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-400 text-xs font-bold flex items-center justify-center gap-2 hover:border-amber-500/60 hover:text-amber-300 transition-colors"
              >
                <Music2 className="w-4 h-4" />
                {musicFile ? `🎵 ${musicFile.name}` : "Escolher música do aparelho"}
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Título do Vídeo</label>
              <Input
                type="text"
                placeholder="Ex: Unboxing do meu pedido HS"
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

            <Button
              type="submit"
              disabled={isSubmittingVideo || !uploadFile}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20"
            >
              {isSubmittingVideo ? "Publicando..." : "Publicar Vídeo Agora"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDITAR PERFIL */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="w-5 h-5 text-amber-400" />
              Meu Perfil no HSTrends
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 mt-2">
            <div className="flex items-center gap-4">
              <img
                src={editAvatarFile ? URL.createObjectURL(editAvatarFile) : userProfile?.avatar_url || FALLBACK_AVATAR}
                alt="Foto de perfil"
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-500"
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setEditAvatarFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()} className="text-xs">
                Trocar Foto
              </Button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Nome de exibição</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 bg-slate-950 border-slate-800 text-white text-xs rounded-xl" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Status</label>
              <Input
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                placeholder="Ex: 🛒 Caçando ofertas na HS"
                maxLength={80}
                className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Biografia</label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Conte quem você é..."
                rows={3}
                maxLength={300}
                className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl resize-none"
              />
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-[11px] text-slate-400 leading-relaxed">
              Selos por seguidores: 500 Bronze · 1.000 Prata · 2.000 Ouro · 5.000 Diamante · 10.000 Lenda HS.
              Você tem <span className="text-amber-400 font-bold">{myFollowersCount}</span> seguidores.
            </div>

            <Button type="submit" disabled={isSavingProfile} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs">
              {isSavingProfile ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reprodutor HTML5 com autoplay mudo
function HTML5VideoPlayer({
  src,
  isActive,
  isMuted,
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
    if (!video || !src) return;

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
  }, [isActive, isMuted, src]);

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
    <div onClick={handleToggle} className="relative w-full h-full cursor-pointer flex items-center justify-center bg-black">
      <video ref={videoRef} src={src} loop playsInline muted={isMuted} preload="auto" className="w-full h-full object-cover" />

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
