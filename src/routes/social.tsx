import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  Check,
  CheckCheck,
  ChevronLeft,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Send,
  Square,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  Play,
  Pause,
  Edit2,
  Ban,
  MessageSquare,
  LogOut,
  Info,
  Shield,
  Sparkles,
  ArrowLeft,
  Settings,
  Smile,
  Paperclip,
  CheckCircle2,
  Upload,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "HS Social · Conversas, Grupos e Status" },
      {
        name: "description",
        content: "Chat profissional com privacidade, grupos e stories da HS Digital.",
      },
    ],
  }),
  component: HSSocialPage,
});

// ==========================================
// TIPAGENS DO HS SOCIAL
// ==========================================
interface UserProfile {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  bio: string;
  isConfigured: boolean;
}

interface ContactItem {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  avatar: string;
  isBlocked: boolean;
}

interface SocialMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: "text" | "image" | "audio";
  content: string;
  mediaUrl?: string;
  timestamp: number;
  isEdited?: boolean;
  deletedForAll?: boolean;
}

interface SocialRoom {
  id: string;
  isGroup: boolean;
  name: string;
  description?: string;
  avatar: string;
  adminId?: string;
  memberIds: string[];
}

interface SocialStatusItem {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  imageUrl: string;
  caption?: string;
  createdAt: number;
}

const STORAGE_KEYS = {
  PERFIL: "hs_social_my_profile",
  GRUPOS: "hs_grupos",
  CONTATOS: "hs_social_contatos_cache",
  STATUSES: "hs_social_statuses_cache",
  MENSAGENS: "hs_messages_cache",
};

// ==========================================
// UTILITÁRIO: COMPRESSÃO DE IMAGENS (CANVAS)
// Evita estouro de cota e travamentos no mobile
// ==========================================
async function compressImage(file: File, maxWidth = 1080, maxHeight = 1080, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function HSSocialPage() {
  // 1. Perfil do Usuário Atual no HS Social
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.PERFIL);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return {
      id: "hs_" + Math.random().toString(36).substring(2, 9),
      name: "Meu Perfil HS",
      phone: "",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
      bio: "Disponível no HS Social",
      isConfigured: false,
    };
  });

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Navegação Principal: Inicia sempre na tela de conversas sem nenhuma aberta
  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "status">("chats");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState("");

  // Dados em Memória
  const [rooms, setRooms] = useState<SocialRoom[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [statuses, setStatuses] = useState<SocialStatusItem[]>([]);

  // Modal: Meu Perfil
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState(currentUser.name);
  const [profilePhoneInput, setProfilePhoneInput] = useState(currentUser.phone);
  const [profileBioInput, setProfileBioInput] = useState(currentUser.bio);
  const [profileAvatarInput, setProfileAvatarInput] = useState(currentUser.avatar);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Modais de Contato
  const [showAddContact, setShowAddContact] = useState(false);
  const [inputPhone, setInputPhone] = useState("");
  const [isValidatingContact, setIsValidatingContact] = useState(false);

  // Modais de Grupos
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [viewingGroupInfo, setViewingGroupInfo] = useState<SocialRoom | null>(null);

  // Modais de Status / Stories
  const [showPostStatusModal, setShowPostStatusModal] = useState(false);
  const [statusImageInput, setStatusImageInput] = useState<string | null>(null);
  const [statusCaptionInput, setStatusCaptionInput] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<{
    userId: string;
    authorName: string;
    authorAvatar: string;
    items: SocialStatusItem[];
  } | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  // Perfil de Contato Externo
  const [viewingProfileContact, setViewingProfileContact] = useState<ContactItem | null>(null);

  // Mensagens
  const [inputMessage, setInputMessage] = useState("");
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<SocialMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");

  // Gravação de Áudio Nativo
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs para Câmera e Galeria de Fotos
  const profileCameraInputRef = useRef<HTMLInputElement>(null);
  const profileGalleryInputRef = useRef<HTMLInputElement>(null);
  const groupCameraInputRef = useRef<HTMLInputElement>(null);
  const groupGalleryInputRef = useRef<HTMLInputElement>(null);
  const statusCameraInputRef = useRef<HTMLInputElement>(null);
  const statusGalleryInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // CARREGAR DADOS DA CONTA HS DIGITAL (SUPABASE)
  // ==========================================
  useEffect(() => {
    async function loadAccountData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Consultar a tabela profiles da HS Digital Marketplace
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .maybeSingle();

          setCurrentUser((prev) => {
            const updated: UserProfile = {
              ...prev,
              id: user.id,
              name: prev.isConfigured ? prev.name : dbProfile?.full_name || prev.name,
              phone: prev.isConfigured ? prev.phone : dbProfile?.phone || prev.phone,
            };
            localStorage.setItem(STORAGE_KEYS.PERFIL, JSON.stringify(updated));
            return updated;
          });
        }
      } catch {}
    }

    loadAccountData();
  }, []);

  // Sincronizar inputs do modal de perfil quando currentUser mudar
  useEffect(() => {
    setProfileNameInput(currentUser.name);
    setProfilePhoneInput(currentUser.phone);
    setProfileBioInput(currentUser.bio);
    setProfileAvatarInput(currentUser.avatar);
  }, [currentUser]);

  // Presença Realtime (Online / Offline)
  useEffect(() => {
    if (!currentUser.id) return;

    const channel = supabase.channel("hs-social-presence", {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineIds = new Set<string>();
        Object.keys(state).forEach((key) => onlineIds.add(key));
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id]);

  // Carregar Grupos, Contatos e Status
  useEffect(() => {
    // 1. Grupos
    const localGrupos: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRUPOS) || "[]");
    const localRooms: SocialRoom[] = localGrupos.map((g) => ({
      id: String(g.id),
      isGroup: true,
      name: g.nome,
      description: g.descricao,
      avatar: g.foto || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop",
      adminId: g.adminId || currentUser.id,
      memberIds: g.participantes || [currentUser.id],
    }));
    setRooms(localRooms);

    // 2. Contatos
    const savedContacts: ContactItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTATOS) || "[]");
    setContacts(savedContacts);

    // 3. Status (Expira em 24h)
    const savedStatuses: SocialStatusItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATUSES) || "[]");
    const validStatuses = savedStatuses.filter((s) => Date.now() - s.createdAt < 24 * 60 * 60 * 1000);
    setStatuses(validStatuses);
  }, [currentUser.id]);

  // Carregar Mensagens da Sala Ativa
  useEffect(() => {
    if (!selectedRoomId) return;

    const localMsgs: Record<string, SocialMessage[]> = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.MENSAGENS) || "{}"
    );
    if (localMsgs[selectedRoomId]) {
      setMessages(localMsgs[selectedRoomId]);
    } else {
      setMessages([]);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sala ativa
  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  // Indicador de Status Online
  const isRecipientOnline = useMemo(() => {
    if (!activeRoom || activeRoom.isGroup) return false;
    const otherId = activeRoom.memberIds.find((id) => id !== currentUser.id);
    return otherId ? onlineUserIds.has(otherId) : false;
  }, [activeRoom, currentUser.id, onlineUserIds]);

  // ==========================================
  // 1. SALVAR MEU PERFIL (HS SOCIAL)
  // ==========================================
  const handleSaveMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNameInput.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }

    setIsSavingProfile(true);
    const updated: UserProfile = {
      id: currentUser.id,
      name: profileNameInput.trim(),
      phone: profilePhoneInput.trim(),
      avatar: profileAvatarInput,
      bio: profileBioInput.trim() || "Disponível no HS Social",
      isConfigured: true,
    };

    setCurrentUser(updated);
    localStorage.setItem(STORAGE_KEYS.PERFIL, JSON.stringify(updated));

    // Se estiver autenticado no marketplace, sincroniza com tabela profiles
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            full_name: updated.name,
            phone: updated.phone,
          })
          .eq("id", user.id);
      }
    } catch {}

    setIsSavingProfile(false);
    setShowMyProfileModal(false);
    toast.success("Perfil do HS Social salvo com sucesso!");
  };

  const handleProfilePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const compressed = await compressImage(file, 600, 600, 0.8);
      setProfileAvatarInput(compressed);
      toast.success("Foto carregada!");
    } catch {
      toast.error("Erro ao processar imagem.");
    } finally {
      setIsProcessingImage(false);
      e.target.value = "";
    }
  };

  // ==========================================
  // 2. GERENCIAMENTO DE GRUPOS (SEM TRAVAMENTOS)
  // ==========================================
  const handleGroupPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const compressed = await compressImage(file, 600, 600, 0.8);
      setGroupPhoto(compressed);
      toast.success("Foto do grupo carregada!");
    } catch {
      toast.error("Erro ao carregar foto do grupo.");
    } finally {
      setIsProcessingImage(false);
      e.target.value = "";
    }
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Digite o nome do grupo.");
      return;
    }

    const allMembers = Array.from(new Set([currentUser.id, ...selectedParticipants]));
    const defaultPhoto =
      groupPhoto || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop";

    const newGroupId = "grp_" + Date.now();
    const newGroup: SocialRoom = {
      id: newGroupId,
      isGroup: true,
      name: groupName.trim(),
      description: groupDesc.trim() || "Grupo HS Social",
      avatar: defaultPhoto,
      adminId: currentUser.id,
      memberIds: allMembers,
    };

    // 1. Persistir no localStorage
    try {
      const localGrupos: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRUPOS) || "[]");
      localGrupos.unshift({
        id: newGroup.id,
        nome: newGroup.name,
        descricao: newGroup.description,
        foto: newGroup.avatar,
        adminId: newGroup.adminId,
        participantes: newGroup.memberIds,
      });
      localStorage.setItem(STORAGE_KEYS.GRUPOS, JSON.stringify(localGrupos));
    } catch (err) {
      console.error(err);
    }

    setRooms((prev) => [newGroup, ...prev]);
    setSelectedRoomId(newGroup.id);
    setShowCreateGroup(false);
    setGroupName("");
    setGroupDesc("");
    setGroupPhoto(null);
    setSelectedParticipants([]);
    toast.success("Grupo criado com sucesso!");
  };

  const handleExcluirGrupo = (groupId: string) => {
    if (!confirm("Deseja realmente excluir este grupo permanentemente?")) return;

    let localGrupos: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRUPOS) || "[]");
    localGrupos = localGrupos.filter((g) => String(g.id) !== groupId);
    localStorage.setItem(STORAGE_KEYS.GRUPOS, JSON.stringify(localGrupos));

    setRooms((prev) => prev.filter((r) => r.id !== groupId));
    if (selectedRoomId === groupId) setSelectedRoomId(null);
    setViewingGroupInfo(null);
    toast.success("Grupo excluído.");
  };

  const handleSairDoGrupo = (groupId: string) => {
    if (!confirm("Deseja sair deste grupo?")) return;

    let localGrupos: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRUPOS) || "[]");
    const grupo = localGrupos.find((g) => String(g.id) === groupId);
    if (grupo) {
      grupo.participantes = (grupo.participantes || []).filter((p: string) => p !== currentUser.id);
      localStorage.setItem(STORAGE_KEYS.GRUPOS, JSON.stringify(localGrupos));
    }

    setRooms((prev) => prev.filter((r) => r.id !== groupId));
    if (selectedRoomId === groupId) setSelectedRoomId(null);
    setViewingGroupInfo(null);
    toast.success("Você saiu do grupo.");
  };

  // Excluir conversa individual e zerar histórico
  const handleDeleteConversation = (roomId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Excluir esta conversa e zerar o histórico?")) return;

    const localMsgs: Record<string, SocialMessage[]> = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.MENSAGENS) || "{}"
    );
    delete localMsgs[roomId];
    localStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(localMsgs));

    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (selectedRoomId === roomId) setSelectedRoomId(null);
    toast.success("Conversa excluída.");
  };

  // ==========================================
  // 3. STORIES E STATUS (CÂMERA E GALERIA)
  // ==========================================
  const handleSelectStatusPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const compressed = await compressImage(file, 1080, 1920, 0.75);
      setStatusImageInput(compressed);
      setShowPostStatusModal(true);
    } catch {
      toast.error("Erro ao carregar imagem para o status.");
    } finally {
      setIsProcessingImage(false);
      e.target.value = "";
    }
  };

  const handlePostStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusImageInput) {
      toast.error("Selecione uma foto para o status.");
      return;
    }

    const newStatus: SocialStatusItem = {
      id: "st_" + Date.now(),
      userId: currentUser.id,
      authorName: currentUser.name || "Você",
      authorAvatar: currentUser.avatar,
      imageUrl: statusImageInput,
      caption: statusCaptionInput,
      createdAt: Date.now(),
    };

    const updated = [newStatus, ...statuses];
    setStatuses(updated);

    try {
      localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(updated.slice(0, 15)));
    } catch {
      // Caso estoure a cota, mantém apenas os 5 mais recentes
      localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(updated.slice(0, 5)));
    }

    toast.success("Status postado! Ele sumirá em 24 horas.");
    setShowPostStatusModal(false);
    setStatusImageInput(null);
    setStatusCaptionInput("");
  };

  // Agrupamento por usuário
  const groupedStories = useMemo(() => {
    const map = new Map<string, { userId: string; authorName: string; authorAvatar: string; items: SocialStatusItem[] }>();
    statuses.forEach((st) => {
      if (!map.has(st.userId)) {
        map.set(st.userId, {
          userId: st.userId,
          authorName: st.authorName,
          authorAvatar: st.authorAvatar,
          items: [],
        });
      }
      map.get(st.userId)!.items.push(st);
    });
    return Array.from(map.values());
  }, [statuses]);

  // Timer de 10 segundos por Story com Pausa ao segurar
  useEffect(() => {
    if (!activeStoryGroup || isStoryPaused) return;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          if (storyIndex < activeStoryGroup.items.length - 1) {
            setStoryIndex((i) => i + 1);
            return 0;
          } else {
            setActiveStoryGroup(null);
            setStoryIndex(0);
            return 0;
          }
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [activeStoryGroup, storyIndex, isStoryPaused]);

  // Rachaduras / Segmentos no anel do story
  const renderStorySegmentedRing = (qtd: number) => {
    const size = 56;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    if (qtd <= 1) {
      return (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth={strokeWidth}
        />
      );
    }

    const gap = 4;
    const dashLength = (circumference - qtd * gap) / qtd;

    return (
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#10b981"
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashLength} ${gap}`}
        strokeDashoffset={-gap / 2}
        strokeLinecap="round"
      />
    );
  };

  // ==========================================
  // 4. VALIDAÇÃO DE CONTATOS (BASE HS DIGITAL)
  // ==========================================
  const handleValidateAndAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = inputPhone.replace(/\D/g, "");

    if (cleanPhone.length < 10) {
      toast.error("Informe um telefone válido com DDD (ex: 69999998888).");
      return;
    }

    if (/^(\d)\1+$/.test(cleanPhone) || cleanPhone === "12345678901") {
      toast.error("Número fictício rejeitado. Digite um número real.");
      return;
    }

    setIsValidatingContact(true);
    try {
      const { data: usuarioDigital, error: errDigital } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .ilike("phone", `%${cleanPhone}%`)
        .maybeSingle();

      if (errDigital || !usuarioDigital) {
        toast.error("Usuário não encontrado na base de dados da HS Digital. Verifique se ele possui conta cadastrada.");
        setIsValidatingContact(false);
        return;
      }

      if (usuarioDigital.id === currentUser.id) {
        toast.error("Você não pode adicionar seu próprio número.");
        setIsValidatingContact(false);
        return;
      }

      const novoContato: ContactItem = {
        id: usuarioDigital.id,
        contactId: usuarioDigital.id,
        name: usuarioDigital.full_name || `Contato (${cleanPhone})`,
        phone: usuarioDigital.phone || cleanPhone,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
        isBlocked: false,
      };

      const updatedContacts = [novoContato, ...contacts.filter((c) => c.contactId !== novoContato.contactId)];
      setContacts(updatedContacts);
      localStorage.setItem(STORAGE_KEYS.CONTATOS, JSON.stringify(updatedContacts));

      toast.success(`${novoContato.name} validado e adicionado ao HS Social!`);
      setShowAddContact(false);
      setInputPhone("");
    } catch {
      toast.error("Erro ao validar dados no servidor.");
    } finally {
      setIsValidatingContact(false);
    }
  };

  // Iniciar conversa com contato
  const startChatWithContact = (contact: ContactItem) => {
    let room = rooms.find((r) => !r.isGroup && r.memberIds.includes(contact.contactId));
    if (!room) {
      room = {
        id: "dm_" + contact.contactId,
        isGroup: false,
        name: contact.name,
        avatar: contact.avatar,
        memberIds: [currentUser.id, contact.contactId],
      };
      setRooms((prev) => [room!, ...prev]);
    }
    setSelectedRoomId(room.id);
    setActiveTab("chats");
  };

  // ==========================================
  // 5. MENSAGENS, FOTOS E GRAVAÇÃO DE ÁUDIO
  // ==========================================
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedRoomId) return;

    const newMsg: SocialMessage = {
      id: "msg_" + Date.now(),
      roomId: selectedRoomId,
      senderId: currentUser.id,
      senderName: currentUser.name || "Você",
      type: "text",
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");

    const localMsgs: Record<string, SocialMessage[]> = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.MENSAGENS) || "{}"
    );
    if (!localMsgs[selectedRoomId]) localMsgs[selectedRoomId] = [];
    localMsgs[selectedRoomId].push(newMsg);
    localStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(localMsgs));
  };

  const handleSendPhotoMessage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoomId) return;

    try {
      const compressed = await compressImage(file, 900, 900, 0.75);
      const newMsg: SocialMessage = {
        id: "img_" + Date.now(),
        roomId: selectedRoomId,
        senderId: currentUser.id,
        senderName: currentUser.name || "Você",
        type: "image",
        content: "Foto enviada",
        mediaUrl: compressed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newMsg]);

      const localMsgs: Record<string, SocialMessage[]> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.MENSAGENS) || "{}"
      );
      if (!localMsgs[selectedRoomId]) localMsgs[selectedRoomId] = [];
      localMsgs[selectedRoomId].push(newMsg);
      localStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(localMsgs));
    } catch {
      toast.error("Erro ao enviar imagem.");
    } finally {
      e.target.value = "";
    }
  };

  // Gravação de Áudio Nativo
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const audioBase64 = reader.result as string;
          if (selectedRoomId) {
            const newMsg: SocialMessage = {
              id: "aud_" + Date.now(),
              roomId: selectedRoomId,
              senderId: currentUser.id,
              senderName: currentUser.name || "Você",
              type: "audio",
              content: "Mensagem de voz",
              mediaUrl: audioBase64,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, newMsg]);

            const localMsgs: Record<string, SocialMessage[]> = JSON.parse(
              localStorage.getItem(STORAGE_KEYS.MENSAGENS) || "{}"
            );
            if (!localMsgs[selectedRoomId]) localMsgs[selectedRoomId] = [];
            localMsgs[selectedRoomId].push(newMsg);
            localStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(localMsgs));
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Permissão de microfone não concedida.");
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const togglePlayAudio = (msgId: string, url?: string) => {
    if (!url) return;
    let audio = audioElementsRef.current[msgId];
    if (!audio) {
      audio = new Audio(url);
      audioElementsRef.current[msgId] = audio;
      audio.onended = () => setPlayingAudioId(null);
    }

    if (playingAudioId === msgId) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }
      audio.play();
      setPlayingAudioId(msgId);
    }
  };

  // Ações de Mensagem (Toque Longo / Menu)
  const handleDeleteMessageForMe = () => {
    if (!selectedMessageForAction) return;
    setMessages((prev) => prev.filter((m) => m.id !== selectedMessageForAction.id));
    setSelectedMessageForAction(null);
    toast.success("Mensagem apagada para você.");
  };

  const handleDeleteMessageForAll = () => {
    if (!selectedMessageForAction) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === selectedMessageForAction.id
          ? { ...m, deletedForAll: true, content: "🚫 Esta mensagem foi apagada" }
          : m
      )
    );
    setSelectedMessageForAction(null);
    toast.success("Mensagem cancelada para todos.");
  };

  const handleSaveEditMessage = () => {
    if (!editingMessageId || !editMessageText.trim()) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingMessageId ? { ...m, content: editMessageText.trim(), isEdited: true } : m
      )
    );
    setEditingMessageId(null);
    setEditMessageText("");
    toast.success("Mensagem corrigida.");
  };

  return (
    // ESTRUTURA GERAL: Sem rodapé do marketplace, 100dvh fixa, cores oficiais HS Social
    <div className="flex flex-col h-[100dvh] w-full bg-[#f0f2f5] dark:bg-zinc-950 overflow-hidden font-sans select-none text-zinc-900 dark:text-zinc-100">
      {/* ============================================================== */}
      {/* CABEÇALHO EXCLUSIVO DO HS SOCIAL (BARRA ROXA REMOVIDA) */}
      {/* ============================================================== */}
      <header className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-3 md:px-4 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            to="/"
            title="Voltar ao Marketplace HS Digital"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* Ícone de Conversa e Marca HS Social */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none text-zinc-900 dark:text-zinc-50">
                HS Social
              </h1>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Conectado e Seguro
              </span>
            </div>
          </div>
        </div>

        {/* AÇÕES SUPERIORES: MEU PERFIL, ADICIONAR CONTATO E NOVO GRUPO */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* BOTÃO MEU PERFIL COM AVATAR */}
          <button
            onClick={() => setShowMyProfileModal(true)}
            className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
            title="Configurar Meu Perfil"
          >
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-6 w-6 rounded-full object-cover border border-emerald-500"
              />
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white" />
            </div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 hidden sm:inline max-w-[100px] truncate">
              {currentUser.name.split(" ")[0]}
            </span>
          </button>

          <Button
            size="sm"
            onClick={() => setShowAddContact(true)}
            className="h-8 px-2 md:px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden md:inline">Adicionar</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateGroup(true)}
            className="h-8 px-2 md:px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1"
          >
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="hidden md:inline">Novo Grupo</span>
          </Button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* CORPO DO APLICATIVO: BARRA LATERAL + TELA DE CONVERSA */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================== */}
        {/* BARRA LATERAL */}
        {/* ========================================== */}
        <aside
          className={`w-full md:w-[380px] lg:w-[400px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 ${
            selectedRoomId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* NAVEGAÇÃO DE ABAS */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold bg-zinc-50 dark:bg-zinc-900">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "chats"
                  ? "border-emerald-600 text-emerald-600 font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Conversas
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "contacts"
                  ? "border-emerald-600 text-emerald-600 font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Contatos ({contacts.length})
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "status"
                  ? "border-emerald-600 text-emerald-600 font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Camera className="h-4 w-4" />
              Status ({statuses.length})
            </button>
          </div>

          {/* CAMPO DE BUSCA */}
          <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-400" />
              <Input
                placeholder="Pesquisar conversa ou contato..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none"
              />
            </div>
          </div>

          {/* CONTEÚDO DAS ABAS */}
          <div className="flex-1 overflow-y-auto">
            {/* ABA 1: CONVERSAS */}
            {activeTab === "chats" && (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rooms.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-xs">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                    Nenhuma conversa aberta. Inicie uma nova conversa na aba de contatos ou crie um grupo!
                  </div>
                ) : (
                  rooms
                    .filter((r) => r.name.toLowerCase().includes(chatSearch.toLowerCase()))
                    .map((room) => {
                      const otherId = room.isGroup ? null : room.memberIds.find((id) => id !== currentUser.id);
                      const isOtherOnline = otherId ? onlineUserIds.has(otherId) : false;

                      return (
                        <div
                          key={room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            selectedRoomId === room.id
                              ? "bg-zinc-100 dark:bg-zinc-800"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <img
                              src={room.avatar}
                              alt={room.name}
                              className="h-12 w-12 rounded-full object-cover border"
                            />
                            {!room.isGroup && (
                              <span
                                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                                  isOtherOnline ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-xs truncate flex items-center gap-1.5">
                                {room.name}
                                {room.isGroup && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded">Grupo</span>
                                )}
                              </h4>
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {room.description || "Clique para abrir o chat"}
                            </p>
                          </div>

                          <button
                            onClick={(e) => handleDeleteConversation(room.id, e)}
                            title="Excluir histórico"
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 rounded-full transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            )}

            {/* ABA 2: LISTA DE CONTATOS */}
            {activeTab === "contacts" && (
              <div className="p-2 space-y-1">
                {contacts.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-xs">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                    Você ainda não adicionou contatos. Clique em "Adicionar" no topo com o número de telefone de quem tem conta na HS Digital!
                  </div>
                ) : (
                  contacts
                    .filter((c) => c.name.toLowerCase().includes(chatSearch.toLowerCase()) || c.phone.includes(chatSearch))
                    .map((contact) => (
                      <div
                        key={contact.contactId}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div
                          onClick={() => setViewingProfileContact(contact)}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        >
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="h-10 w-10 rounded-full object-cover border"
                          />
                          <div className="truncate">
                            <h5 className="font-semibold text-xs truncate flex items-center gap-1.5">
                              {contact.name}
                              {contact.isBlocked && (
                                <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">Bloqueado</span>
                              )}
                            </h5>
                            <span className="text-[11px] text-zinc-500">{contact.phone}</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startChatWithContact(contact)}
                          className="h-8 px-2 text-xs text-emerald-600 font-bold"
                        >
                          Conversar
                        </Button>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ABA 3: STATUS COM ACESSO A CÂMERA E GALERIA */}
            {activeTab === "status" && (
              <div className="p-3 space-y-4">
                {/* BOTÕES POSTAR STATUS (CÂMERA E GALERIA) */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={currentUser.avatar}
                        alt="Você"
                        className="h-12 w-12 rounded-full object-cover border-2 border-emerald-500"
                      />
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs truncate">Meu Status</h5>
                      <p className="text-[11px] text-zinc-500">Poste uma foto que dura 24 horas</p>
                    </div>
                  </div>

                  {/* Inputs ocultos com refs para Câmera e Galeria */}
                  <input
                    ref={statusCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleSelectStatusPhoto}
                    className="hidden"
                  />
                  <input
                    ref={statusGalleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSelectStatusPhoto}
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => statusCameraInputRef.current?.click()}
                      disabled={isProcessingImage}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Camera className="h-4 w-4" />
                      Tirar Foto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusGalleryInputRef.current?.click()}
                      disabled={isProcessingImage}
                      className="text-xs font-bold flex items-center justify-center gap-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Galeria
                    </Button>
                  </div>
                </div>

                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Atualizações Recentes
                </div>

                {groupedStories.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs">
                    Nenhum status ativo no momento. Seja o primeiro a postar!
                  </div>
                ) : (
                  groupedStories.map((group) => {
                    const qtd = group.items.length;
                    return (
                      <div
                        key={group.userId}
                        onClick={() => {
                          setActiveStoryGroup(group);
                          setStoryIndex(0);
                          setStoryProgress(0);
                          setIsStoryPaused(false);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                      >
                        {/* ANEL COM RACHADURAS / SEGMENTOS SVG */}
                        <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                          <svg className="absolute inset-0 h-full w-full -rotate-90">
                            {renderStorySegmentedRing(qtd)}
                          </svg>
                          <img
                            src={group.authorAvatar}
                            alt={group.authorName}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        </div>

                        <div className="flex-1">
                          <h4 className="font-semibold text-xs">{group.authorName}</h4>
                          <span className="text-[10px] text-emerald-600 font-medium">
                            {qtd === 1 ? "1 Story" : `${qtd} Stories`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ========================================== */}
        {/* ÁREA CENTRAL DO CHAT (MENSAGENS FIXAS) */}
        {/* ========================================== */}
        <main className={`flex-1 bg-[#efeae2] dark:bg-zinc-950 flex flex-col min-w-0 ${selectedRoomId ? "flex" : "hidden md:flex"}`}>
          {activeRoom ? (
            <>
              {/* CABEÇALHO DO CHAT ATIVO */}
              <div className="h-16 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedRoomId(null)}
                    className="md:hidden p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>

                  <div
                    onClick={() => {
                      if (activeRoom.isGroup) {
                        setViewingGroupInfo(activeRoom);
                      } else {
                        const otherId = activeRoom.memberIds.find((id) => id !== currentUser.id);
                        const contact = contacts.find((c) => c.contactId === otherId);
                        if (contact) setViewingProfileContact(contact);
                      }
                    }}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={activeRoom.avatar}
                        alt={activeRoom.name}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                      {!activeRoom.isGroup && (
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            isRecipientOnline ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                      )}
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-sm truncate group-hover:text-emerald-600 transition-colors">
                        {activeRoom.name}
                      </h4>
                      {!activeRoom.isGroup ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isRecipientOnline ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          <span className={isRecipientOnline ? "text-emerald-600 font-medium" : "text-zinc-400"}>
                            {isRecipientOnline ? "Online agora" : "Offline"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500">
                          {activeRoom.memberIds.length} participantes • Ver detalhes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {activeRoom.isGroup && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewingGroupInfo(activeRoom)}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                    >
                      <Info className="h-4 w-4 mr-1" /> Grupo
                    </Button>
                  )}
                  <button
                    onClick={() => handleDeleteConversation(activeRoom.id)}
                    title="Excluir histórico"
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* FLUXO DE MENSAGENS COM ROLAGEM */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-4 rounded-2xl text-center max-w-sm shadow-sm border border-zinc-200/50">
                      <Shield className="h-7 w-7 text-emerald-600 mx-auto mb-1.5" />
                      <h5 className="font-bold text-xs">Conversa com {activeRoom.name}</h5>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Mensagens, áudios e imagens sincronizados com segurança.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;

                    return (
                      <div
                        key={msg.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedMessageForAction(msg);
                        }}
                        className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-sm text-xs transition-all ${
                            isMe
                              ? "bg-[#d9fdd3] dark:bg-emerald-950 text-zinc-900 dark:text-zinc-100 rounded-tr-none"
                              : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800"
                          }`}
                        >
                          {/* Nome em grupos */}
                          {activeRoom.isGroup && !isMe && (
                            <span className="block font-bold text-[10px] text-emerald-700 dark:text-emerald-400 mb-1">
                              {msg.senderName}
                            </span>
                          )}

                          {/* IMAGEM */}
                          {msg.type === "image" && msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-h-64 border border-black/10">
                              <img src={msg.mediaUrl} alt="Foto" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {/* ÁUDIO NATIVO */}
                          {msg.type === "audio" && msg.mediaUrl && (
                            <div className="flex items-center gap-3 py-1 min-w-[200px]">
                              <button
                                onClick={() => togglePlayAudio(msg.id, msg.mediaUrl)}
                                className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-700"
                              >
                                {playingAudioId === msg.id ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4 ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="h-1.5 w-full bg-zinc-300 dark:bg-zinc-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-emerald-600 transition-all ${
                                      playingAudioId === msg.id ? "w-2/3" : "w-0"
                                    }`}
                                  />
                                </div>
                                <span className="text-[10px] text-zinc-500 mt-1 block">
                                  {msg.content}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* TEXTO */}
                          {msg.type === "text" && (
                            <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
                          )}

                          {/* HORÁRIO E STATUS */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-zinc-500">
                            {msg.isEdited && <span className="italic">editada •</span>}
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && <CheckCheck className="h-3 w-3 text-emerald-600" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* BARRA INFERIOR DE ENVIO */}
              <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-2 text-red-600 font-bold text-xs animate-pulse">
                      <div className="h-3 w-3 rounded-full bg-red-600" />
                      Gravando áudio: {recordingSeconds}s
                    </div>
                    <Button
                      size="sm"
                      onClick={stopRecordingAudio}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-3"
                    >
                      Enviar Áudio
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSendPhotoMessage}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Enviar Foto"
                      className="p-2 text-zinc-500 hover:text-emerald-600 hover:bg-zinc-100 rounded-full transition-colors"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </button>

                    <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none"
                      />
                      {inputMessage.trim() ? (
                        <Button
                          type="submit"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecordingAudio}
                          title="Gravar áudio"
                          className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center shrink-0 transition-colors"
                        >
                          <Mic className="h-5 w-5" />
                        </button>
                      )}
                    </form>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="max-w-sm">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">
                  Bem-vindo ao HS Social
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Selecione uma conversa ao lado ou inicie um novo bate-papo seguro com seus contatos e grupos.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: MEU PERFIL (CÂMERA, GALERIA, NOME, TELEFONE) */}
      {/* ============================================================== */}
      {showMyProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <User className="h-4 w-4 text-emerald-600" /> Meu Perfil HS Social
              </h3>
              <button onClick={() => setShowMyProfileModal(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMyProfile} className="mt-4 space-y-4">
              {/* FOTO COM BOTÕES DE CÂMERA E GALERIA */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img
                    src={profileAvatarInput}
                    alt="Foto de Perfil"
                    className="h-20 w-20 rounded-full object-cover border-4 border-emerald-500 shadow-md"
                  />
                  <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                {/* Inputs de arquivo para Perfil */}
                <input
                  ref={profileCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleProfilePhotoFile}
                  className="hidden"
                />
                <input
                  ref={profileGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoFile}
                  className="hidden"
                />

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => profileCameraInputRef.current?.click()}
                    disabled={isProcessingImage}
                    className="h-7 text-[11px] font-semibold flex items-center gap-1 border-emerald-300 text-emerald-700"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Câmera
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => profileGalleryInputRef.current?.click()}
                    disabled={isProcessingImage}
                    className="h-7 text-[11px] font-semibold flex items-center gap-1 border-emerald-300 text-emerald-700"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Galeria
                  </Button>
                </div>
              </div>

              {/* CAMPOS DE DADOS */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                    Nome Completo:
                  </label>
                  <Input
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="Seu nome"
                    className="text-xs h-9 mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                    Número de Telefone (HS Digital):
                  </label>
                  <Input
                    value={profilePhoneInput}
                    onChange={(e) => setProfilePhoneInput(e.target.value)}
                    placeholder="Ex: 69999998888"
                    className="text-xs h-9 mt-1"
                  />
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Utilize o mesmo número cadastrado na conta da loja HS Digital.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                    Recado / Status:
                  </label>
                  <Input
                    value={profileBioInput}
                    onChange={(e) => setProfileBioInput(e.target.value)}
                    placeholder="Disponível no HS Social"
                    className="text-xs h-9 mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMyProfileModal(false)}
                  className="flex-1 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {isSavingProfile ? "Salvando..." : "Salvar Perfil"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CRIAR GRUPO (CÂMERA, GALERIA E PARTICIPANTES) */}
      {/* ============================================================== */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> Criar Novo Grupo
              </h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="mt-4 space-y-3">
              {/* FOTO DO GRUPO */}
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-emerald-500 mb-2">
                  <img
                    src={
                      groupPhoto ||
                      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop"
                    }
                    alt="Foto Grupo"
                    className="h-full w-full object-cover"
                  />
                </div>

                <input
                  ref={groupCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleGroupPhotoFile}
                  className="hidden"
                />
                <input
                  ref={groupGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGroupPhotoFile}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => groupCameraInputRef.current?.click()}
                    disabled={isProcessingImage}
                    className="h-6 text-[10px] px-2 border-emerald-300 text-emerald-700"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Câmera
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => groupGalleryInputRef.current?.click()}
                    disabled={isProcessingImage}
                    className="h-6 text-[10px] px-2 border-emerald-300 text-emerald-700"
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Galeria
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">Nome do Grupo:</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Família HS ou Amigos"
                  className="text-xs h-9 mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">Descrição:</label>
                <Input
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Assunto ou regras do grupo"
                  className="text-xs h-9 mt-1"
                />
              </div>

              {/* SELEÇÃO DE PARTICIPANTES */}
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Participantes ({selectedParticipants.length}):
                </label>
                <div className="max-h-32 overflow-y-auto border rounded-xl p-2 space-y-1">
                  {contacts.length === 0 ? (
                    <span className="text-[11px] text-zinc-400 block text-center py-2">
                      Nenhum contato adicionado ainda. Você será o administrador.
                    </span>
                  ) : (
                    contacts.map((c) => {
                      const isSel = selectedParticipants.includes(c.contactId);
                      return (
                        <div
                          key={c.contactId}
                          onClick={() => {
                            setSelectedParticipants((prev) =>
                              isSel ? prev.filter((id) => id !== c.contactId) : [...prev, c.contactId]
                            );
                          }}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer ${
                            isSel ? "bg-emerald-50 text-emerald-800 font-bold" : "hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img src={c.avatar} alt={c.name} className="h-6 w-6 rounded-full object-cover" />
                            <span className="truncate">{c.name}</span>
                          </div>
                          {isSel && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Criar Grupo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: POSTAR STATUS (PREVIEW E LEGENDA) */}
      {/* ============================================================== */}
      {showPostStatusModal && statusImageInput && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-4 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-2 border-b mb-3">
              <h3 className="font-bold text-xs">Publicar no Meu Status</h3>
              <button
                onClick={() => {
                  setShowPostStatusModal(false);
                  setStatusImageInput(null);
                }}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden max-h-72 border bg-black flex items-center justify-center">
              <img src={statusImageInput} alt="Preview Status" className="max-h-72 w-auto object-contain" />
            </div>

            <form onSubmit={handlePostStatusSubmit} className="mt-3 space-y-3">
              <Input
                placeholder="Adicione uma legenda (opcional)..."
                value={statusCaptionInput}
                onChange={(e) => setStatusCaptionInput(e.target.value)}
                className="text-xs h-9"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPostStatusModal(false);
                    setStatusImageInput(null);
                  }}
                  className="flex-1 text-xs"
                >
                  Descartar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Publicar Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADICIONAR CONTATO POR TELEFONE */}
      {/* ============================================================== */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-600" /> Adicionar Contato
              </h3>
              <button onClick={() => setShowAddContact(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleValidateAndAddContact} className="mt-4 space-y-3">
              <p className="text-xs text-zinc-500">
                Digite o número com DDD. O contato só será adicionado se possuir conta ativa na HS Digital.
              </p>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">Número de Celular com DDD:</label>
                <Input
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="Ex: 69999998888"
                  className="text-xs h-9 mt-1"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddContact(false)}
                  className="flex-1 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isValidatingContact}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {isValidatingContact ? "Validando..." : "Validar e Adicionar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: VISUALIZADOR DE STORIES (ESTILO INSTA/WHATSAPP) */}
      {/* ============================================================== */}
      {activeStoryGroup && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none"
          onMouseDown={() => setIsStoryPaused(true)}
          onMouseUp={() => setIsStoryPaused(false)}
          onTouchStart={() => setIsStoryPaused(true)}
          onTouchEnd={() => setIsStoryPaused(false)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x > rect.width / 2) {
              if (storyIndex < activeStoryGroup.items.length - 1) {
                setStoryIndex((i) => i + 1);
                setStoryProgress(0);
              } else {
                setActiveStoryGroup(null);
              }
            } else {
              if (storyIndex > 0) {
                setStoryIndex((i) => i - 1);
                setStoryProgress(0);
              }
            }
          }}
        >
          {/* BARRA DE PROGRESSO SEGMENTADA */}
          <div className="absolute top-4 left-4 right-4 z-20 flex gap-1.5">
            {activeStoryGroup.items.map((_, idx) => (
              <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width:
                      idx < storyIndex
                        ? "100%"
                        : idx === storyIndex
                        ? `${storyProgress}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* CABEÇALHO DO STORY */}
          <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <img
                src={activeStoryGroup.authorAvatar}
                alt={activeStoryGroup.authorName}
                className="h-9 w-9 rounded-full object-cover border-2 border-white"
              />
              <div>
                <h4 className="font-bold text-xs drop-shadow">{activeStoryGroup.authorName}</h4>
                <span className="text-[10px] text-white/80 drop-shadow">
                  {new Date(activeStoryGroup.items[storyIndex].createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveStoryGroup(null);
              }}
              className="p-1 rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* FOTO DO STORY */}
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={activeStoryGroup.items[storyIndex].imageUrl}
              alt="Story"
              className="max-h-[85vh] max-w-full object-contain pointer-events-none"
            />
          </div>

          {/* LEGENDA */}
          {activeStoryGroup.items[storyIndex].caption && (
            <div className="absolute bottom-8 left-4 right-4 z-20 text-center">
              <p className="inline-block bg-black/60 text-white px-4 py-2 rounded-2xl text-xs backdrop-blur-sm">
                {activeStoryGroup.items[storyIndex].caption}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: DETALHES DO GRUPO (SAIR OU EXCLUIR) */}
      {/* ============================================================== */}
      {viewingGroupInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm">Informações do Grupo</h3>
              <button onClick={() => setViewingGroupInfo(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center mt-4">
              <img
                src={viewingGroupInfo.avatar}
                alt={viewingGroupInfo.name}
                className="h-20 w-20 rounded-full object-cover border-2 border-emerald-500 shadow-md"
              />
              <h4 className="font-bold text-base mt-2">{viewingGroupInfo.name}</h4>
              <p className="text-xs text-zinc-500 mt-0.5">{viewingGroupInfo.description}</p>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1">
                {viewingGroupInfo.memberIds.length} participantes
              </span>
            </div>

            <div className="mt-6 space-y-2">
              {viewingGroupInfo.adminId === currentUser.id ? (
                <Button
                  onClick={() => handleExcluirGrupo(viewingGroupInfo.id)}
                  variant="destructive"
                  className="w-full text-xs font-bold"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Excluir Grupo Permanentemente
                </Button>
              ) : (
                <Button
                  onClick={() => handleSairDoGrupo(viewingGroupInfo.id)}
                  variant="outline"
                  className="w-full text-xs font-bold text-red-600 border-red-300"
                >
                  <LogOut className="h-4 w-4 mr-1.5" /> Sair do Grupo
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: PERFIL DO CONTATO EXTERNO */}
      {viewingProfileContact && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm">Perfil do Contato</h3>
              <button onClick={() => setViewingProfileContact(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center mt-4">
              <img
                src={viewingProfileContact.avatar}
                alt={viewingProfileContact.name}
                className="h-20 w-20 rounded-full object-cover border-2 border-emerald-500"
              />
              <h4 className="font-bold text-base mt-2">{viewingProfileContact.name}</h4>
              <p className="text-xs text-zinc-500 mt-0.5">{viewingProfileContact.phone}</p>
            </div>

            <div className="mt-6 space-y-2">
              <Button
                onClick={() => {
                  startChatWithContact(viewingProfileContact);
                  setViewingProfileContact(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" /> Enviar Mensagem
              </Button>

              <Button
                onClick={() => {
                  setContacts((prev) =>
                    prev.map((c) =>
                      c.contactId === viewingProfileContact.contactId
                        ? { ...c, isBlocked: !c.isBlocked }
                        : c
                    )
                  );
                  setViewingProfileContact(null);
                  toast.success(
                    viewingProfileContact.isBlocked ? "Contato desbloqueado." : "Contato bloqueado."
                  );
                }}
                variant="outline"
                className={`w-full text-xs font-bold ${
                  viewingProfileContact.isBlocked ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <Ban className="h-4 w-4 mr-1.5" />
                {viewingProfileContact.isBlocked ? "Desbloquear Contato" : "Bloquear Contato"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MENU FLUTUANTE DE AÇÕES NA MENSAGEM */}
      {selectedMessageForAction && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-xs w-full p-3 shadow-xl space-y-1">
            <h5 className="font-bold text-xs px-2 py-1 text-zinc-400">Opções da Mensagem</h5>

            {selectedMessageForAction.senderId === currentUser.id && selectedMessageForAction.type === "text" && (
              <button
                onClick={() => {
                  setEditingMessageId(selectedMessageForAction.id);
                  setEditMessageText(selectedMessageForAction.content);
                  setSelectedMessageForAction(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-zinc-100 rounded-xl transition-colors"
              >
                <Edit2 className="h-4 w-4 text-emerald-600" /> Editar Mensagem
              </button>
            )}

            <button
              onClick={handleDeleteMessageForMe}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-zinc-100 rounded-xl transition-colors text-zinc-700 dark:text-zinc-300"
            >
              <Trash2 className="h-4 w-4 text-zinc-500" /> Apagar para mim
            </button>

            {selectedMessageForAction.senderId === currentUser.id && (
              <button
                onClick={handleDeleteMessageForAll}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-red-50 text-red-600 rounded-xl transition-colors"
              >
                <Ban className="h-4 w-4" /> Apagar para todos
              </button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMessageForAction(null)}
              className="w-full text-xs mt-2"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE MENSAGEM */}
      {editingMessageId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full p-4 shadow-xl space-y-3">
            <h5 className="font-bold text-xs">Editar Mensagem</h5>
            <Input
              value={editMessageText}
              onChange={(e) => setEditMessageText(e.target.value)}
              className="text-xs h-9"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingMessageId(null)}
                className="flex-1 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditMessage}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
