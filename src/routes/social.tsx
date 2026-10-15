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
// CONFIGURAÇÕES GLOBAIS E TIPAGEM
// ==========================================
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
  GRUPOS: "hs_grupos",
  CONTATOS: "hs_social_contatos_cache",
  SALAS: "hs_social_salas_cache",
  STATUSES: "hs_social_statuses_cache",
};

export function HSSocialPage() {
  // Usuário Atual
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Navegação Principal: Inicia obrigatoriamente sem sala aberta (null)
  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "status">("chats");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState("");

  // Dados em Memória
  const [rooms, setRooms] = useState<SocialRoom[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [statuses, setStatuses] = useState<SocialStatusItem[]>([]);

  // Modais de Criação e Ação
  const [showAddContact, setShowAddContact] = useState(false);
  const [inputPhone, setInputPhone] = useState("");
  const [isValidatingContact, setIsValidatingContact] = useState(false);

  // Grupos
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [viewingGroupInfo, setViewingGroupInfo] = useState<SocialRoom | null>(null);

  // Status / Stories
  const [showPostStatusModal, setShowPostStatusModal] = useState(false);
  const [statusImageInput, setStatusImageInput] = useState<string | null>(null);
  const [statusCaptionInput, setStatusCaptionInput] = useState("");
  const [activeStoryGroup, setActiveStoryGroup] = useState<{
    userId: string;
    authorName: string;
    authorAvatar: string;
    items: SocialStatusItem[];
  } | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  // Perfil do Contato
  const [viewingProfileContact, setViewingProfileContact] = useState<ContactItem | null>(null);

  // Mensagens e Gravação
  const [inputMessage, setInputMessage] = useState("");
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<SocialMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");

  // Áudio Nativo
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusCameraInputRef = useRef<HTMLInputElement>(null);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);

  // 1. Identificação do Usuário
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      } else {
        let tempId = localStorage.getItem("hs_social_uid");
        if (!tempId) {
          tempId = "hs_usr_" + Math.random().toString(36).substring(2, 9);
          localStorage.setItem("hs_social_uid", tempId);
        }
        setCurrentUser({ id: tempId, email: "visitante@hsdigital.com" });
      }
    }
    loadUser();
  }, []);

  // 2. Presença Realtime (Online / Offline)
  useEffect(() => {
    if (!currentUser?.id) return;

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
  }, [currentUser?.id]);

  // 3. Carregar e Sincronizar Grupos, Contatos e Status
  useEffect(() => {
    if (!currentUser?.id) return;

    // Carregar Grupos salvos localmente e no banco
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

    // Carregar Contatos do cache ou Supabase
    const savedContacts: ContactItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTATOS) || "[]");
    setContacts(savedContacts);

    // Carregar Status do cache (expiração de 24h)
    const savedStatuses: SocialStatusItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATUSES) || "[]");
    const validStatuses = savedStatuses.filter((s) => Date.now() - s.createdAt < 24 * 60 * 60 * 1000);
    setStatuses(validStatuses);

    // Sincronizar com Supabase se disponível
    async function syncSupabaseData() {
      try {
        const { data: dbRooms } = await supabase
          .from("social_rooms" as any)
          .select("*")
          .or(`member_ids.cs.{${currentUser.id}},admin_id.eq.${currentUser.id}`);

        if (dbRooms && dbRooms.length > 0) {
          const mapped: SocialRoom[] = dbRooms.map((r: any) => ({
            id: r.id,
            isGroup: r.is_group,
            name: r.name,
            description: r.description,
            avatar: r.avatar_url || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop",
            adminId: r.admin_id,
            memberIds: r.member_ids || [],
          }));
          // Mesclar grupos locais com remotos
          const merged = [...mapped];
          localRooms.forEach((lr) => {
            if (!merged.some((m) => m.id === lr.id)) merged.push(lr);
          });
          setRooms(merged);
        } else {
          setRooms(localRooms);
        }
      } catch {
        setRooms(localRooms);
      }
    }

    syncSupabaseData();
  }, [currentUser?.id]);

  // Sincronizar Mensagens da Sala Ativa
  useEffect(() => {
    if (!selectedRoomId || !currentUser?.id) return;

    // Buscar mensagens do localStorage
    const localMsgs: Record<string, SocialMessage[]> = JSON.parse(localStorage.getItem("hs_messages_cache") || "{}");
    if (localMsgs[selectedRoomId]) {
      setMessages(localMsgs[selectedRoomId]);
    } else {
      setMessages([]);
    }

    // Buscar do Supabase em tempo real
    async function fetchMessages() {
      try {
        const { data } = await supabase
          .from("social_messages" as any)
          .select("*")
          .eq("room_id", selectedRoomId)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          const formatted: SocialMessage[] = data.map((m: any) => ({
            id: m.id,
            roomId: m.room_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            type: m.type,
            content: m.deleted_for_all ? "🚫 Esta mensagem foi apagada" : m.content,
            mediaUrl: m.media_url,
            timestamp: new Date(m.created_at).getTime(),
            isEdited: m.is_edited,
            deletedForAll: m.deleted_for_all,
          }));
          setMessages(formatted);
        }
      } catch {}
    }

    fetchMessages();

    const channel = supabase
      .channel(`chat-room-${selectedRoomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_messages", filter: `room_id=eq.${selectedRoomId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const m = payload.new;
            setMessages((prev) => [
              ...prev,
              {
                id: m.id,
                roomId: m.room_id,
                senderId: m.sender_id,
                senderName: m.sender_name,
                type: m.type,
                content: m.deleted_for_all ? "🚫 Esta mensagem foi apagada" : m.content,
                mediaUrl: m.media_url,
                timestamp: new Date(m.created_at).getTime(),
                isEdited: m.is_edited,
                deletedForAll: m.deleted_for_all,
              },
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoomId, currentUser?.id]);

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
    const otherId = activeRoom.memberIds.find((id) => id !== currentUser?.id);
    return otherId ? onlineUserIds.has(otherId) : false;
  }, [activeRoom, currentUser?.id, onlineUserIds]);

  // ==========================================
  // 1. VALIDAÇÃO DE CONTATOS (HS Digital vs HS Social)
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
      // 1. Validar na Base da HS Digital (tabela profiles)
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

      if (usuarioDigital.id === currentUser?.id) {
        toast.error("Você não pode adicionar seu próprio número.");
        setIsValidatingContact(false);
        return;
      }

      // 2. Contato Válido: Criar / Atualizar no HS Social
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
    if (contact.isBlocked) {
      toast.error("Contato bloqueado. Desbloqueie-o para iniciar uma conversa.");
      return;
    }

    let existingRoom = rooms.find(
      (r) => !r.isGroup && r.memberIds.includes(currentUser.id) && r.memberIds.includes(contact.contactId)
    );

    if (!existingRoom) {
      existingRoom = {
        id: "room_" + contact.contactId,
        isGroup: false,
        name: contact.name,
        avatar: contact.avatar,
        memberIds: [currentUser.id, contact.contactId],
      };
      const updatedRooms = [existingRoom, ...rooms];
      setRooms(updatedRooms);
    }

    setSelectedRoomId(existingRoom.id);
    setActiveTab("chats");
  };

  // ==========================================
  // 2. GERENCIAMENTO DE GRUPOS (Persistência e UI)
  // ==========================================
  const handleGroupPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setGroupPhoto(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !currentUser?.id) return;

    const allMembers = Array.from(new Set([currentUser.id, ...selectedParticipants]));
    const defaultPhoto =
      groupPhoto || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop";

    const newGroupId = String(Date.now());
    const newGroup: SocialRoom = {
      id: newGroupId,
      isGroup: true,
      name: groupName.trim(),
      description: groupDesc.trim() || "Grupo HS Social",
      avatar: defaultPhoto,
      adminId: currentUser.id,
      memberIds: allMembers,
    };

    // 1. Salvar no localStorage (hs_grupos)
    const localGrupos: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRUPOS) || "[]");
    localGrupos.push({
      id: newGroup.id,
      nome: newGroup.name,
      descricao: newGroup.description,
      foto: newGroup.avatar,
      adminId: newGroup.adminId,
      participantes: newGroup.memberIds,
    });
    localStorage.setItem(STORAGE_KEYS.GRUPOS, JSON.stringify(localGrupos));

    // 2. Salvar no Supabase
    try {
      await supabase.from("social_rooms" as any).insert({
        id: newGroup.id,
        is_group: true,
        name: newGroup.name,
        description: newGroup.description,
        avatar_url: newGroup.avatar,
        admin_id: currentUser.id,
        member_ids: allMembers,
      });
    } catch {}

    setRooms((prev) => [newGroup, ...prev]);
    setSelectedRoomId(newGroup.id);
    setShowCreateGroup(false);
    setGroupName("");
    setGroupDesc("");
    setGroupPhoto(null);
    setSelectedParticipants([]);
    toast.success("Grupo criado com sucesso!");
  };

  const handleExcluirGrupo = async (groupId: string) => {
    if (!confirm("Deseja realmente excluir este grupo permanentemente?")) return;

    // Atualizar no localStorage
    let localGrupos: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRUPOS) || "[]");
    localGrupos = localGrupos.filter((g) => String(g.id) !== groupId);
    localStorage.setItem(STORAGE_KEYS.GRUPOS, JSON.stringify(localGrupos));

    // Atualizar no Supabase
    try {
      await supabase.from("social_rooms" as any).delete().eq("id", groupId);
    } catch {}

    setRooms((prev) => prev.filter((r) => r.id !== groupId));
    if (selectedRoomId === groupId) setSelectedRoomId(null);
    setViewingGroupInfo(null);
    toast.success("Grupo excluído.");
  };

  const handleSairDoGrupo = async (groupId: string) => {
    if (!confirm("Deseja sair deste grupo?")) return;

    let localGrupos: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRUPOS) || "[]");
    const grupo = localGrupos.find((g) => String(g.id) === groupId);
    if (grupo) {
      grupo.participantes = (grupo.participantes || []).filter((p: string) => p !== currentUser?.id);
      localStorage.setItem(STORAGE_KEYS.GRUPOS, JSON.stringify(localGrupos));
    }

    try {
      await supabase
        .from("social_rooms" as any)
        .update({
          member_ids: supabase.rpc("array_remove", {
            arr: "member_ids",
            val: currentUser.id,
          } as any),
        })
        .eq("id", groupId);
    } catch {}

    setRooms((prev) => prev.filter((r) => r.id !== groupId));
    if (selectedRoomId === groupId) setSelectedRoomId(null);
    setViewingGroupInfo(null);
    toast.success("Você saiu do grupo.");
  };

  // Excluir conversa individual e zerar histórico
  const handleDeleteConversation = (roomId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Excluir esta conversa e zerar o histórico?")) return;

    // Limpar cache de mensagens da sala
    const localMsgs: Record<string, SocialMessage[]> = JSON.parse(localStorage.getItem("hs_messages_cache") || "{}");
    delete localMsgs[roomId];
    localStorage.setItem("hs_messages_cache", JSON.stringify(localMsgs));

    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (selectedRoomId === roomId) setSelectedRoomId(null);
    toast.success("Conversa excluída.");
  };

  // ==========================================
  // 3. SISTEMA DE STORIES (Visualização e Rachaduras)
  // ==========================================
  const handleSelectStatusPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setStatusImageInput(event.target?.result as string);
      setShowPostStatusModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePostStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusImageInput || !currentUser?.id) return;

    const newStatus: SocialStatusItem = {
      id: "st_" + Date.now(),
      userId: currentUser.id,
      authorName: "Você",
      authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
      imageUrl: statusImageInput,
      caption: statusCaptionInput,
      createdAt: Date.now(),
    };

    const updated = [newStatus, ...statuses];
    setStatuses(updated);
    localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(updated));

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
        return prev + 1; // 1% a cada 100ms = 10s
      });
    }, 100);

    return () => clearInterval(timer);
  }, [activeStoryGroup, storyIndex, isStoryPaused]);

  // Função para desenhar as rachaduras / segmentos SVG no anel do story
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
  // 4. MENSAGENS, FOTOS E ÁUDIO
  // ==========================================
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedRoomId || !currentUser?.id) return;

    const newMsg: SocialMessage = {
      id: "msg_" + Date.now(),
      roomId: selectedRoomId,
      senderId: currentUser.id,
      senderName: "Você",
      type: "text",
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");

    // Persistir no cache local
    const localMsgs: Record<string, SocialMessage[]> = JSON.parse(localStorage.getItem("hs_messages_cache") || "{}");
    if (!localMsgs[selectedRoomId]) localMsgs[selectedRoomId] = [];
    localMsgs[selectedRoomId].push(newMsg);
    localStorage.setItem("hs_messages_cache", JSON.stringify(localMsgs));

    // Supabase
    try {
      supabase.from("social_messages" as any).insert({
        room_id: selectedRoomId,
        sender_id: currentUser.id,
        sender_name: "Você",
        type: "text",
        content: newMsg.content,
      });
    } catch {}
  };

  const handleSendPhotoMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoomId || !currentUser?.id) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newMsg: SocialMessage = {
        id: "img_" + Date.now(),
        roomId: selectedRoomId,
        senderId: currentUser.id,
        senderName: "Você",
        type: "image",
        content: "Foto enviada",
        mediaUrl: base64,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newMsg]);

      const localMsgs: Record<string, SocialMessage[]> = JSON.parse(localStorage.getItem("hs_messages_cache") || "{}");
      if (!localMsgs[selectedRoomId]) localMsgs[selectedRoomId] = [];
      localMsgs[selectedRoomId].push(newMsg);
      localStorage.setItem("hs_messages_cache", JSON.stringify(localMsgs));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
          if (selectedRoomId && currentUser?.id) {
            const newMsg: SocialMessage = {
              id: "aud_" + Date.now(),
              roomId: selectedRoomId,
              senderId: currentUser.id,
              senderName: "Você",
              type: "audio",
              content: "Mensagem de voz",
              mediaUrl: audioBase64,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, newMsg]);

            const localMsgs: Record<string, SocialMessage[]> = JSON.parse(
              localStorage.getItem("hs_messages_cache") || "{}"
            );
            if (!localMsgs[selectedRoomId]) localMsgs[selectedRoomId] = [];
            localMsgs[selectedRoomId].push(newMsg);
            localStorage.setItem("hs_messages_cache", JSON.stringify(localMsgs));
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
    // ESTRUTURA GERAL: Sem rodapé, sem barra roxa do marketplace, altura 100dvh fixa
    <div className="flex flex-col h-[100dvh] w-full bg-[#f0f2f5] dark:bg-zinc-950 overflow-hidden font-sans select-none text-zinc-900 dark:text-zinc-100">
      {/* ============================================================== */}
      {/* CABEÇALHO EXCLUSIVO DO HS SOCIAL (BARRA ROXA REMOVIDA) */}
      {/* ============================================================== */}
      <header className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            title="Voltar à Loja HS Digital"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* Ícone de Conversa e Nome Configurado */}
          <div className="flex items-center gap-2.5">
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

        {/* Botões de Ações Rápidas */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAddContact(true)}
            className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar Contato</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateGroup(true)}
            className="h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Novo Grupo</span>
          </Button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* CORPO DO APLICATIVO: BARRA LATERAL + TELA DE CONVERSA */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================== */}
        {/* BARRA LATERAL (LISTA) */}
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
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Stories
            </button>
          </div>

          {/* CAMPO DE PESQUISA */}
          <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Pesquisar conversas ou contatos..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* LISTAGEM DA ABA SELECIONADA */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {/* ABA 1: CONVERSAS E GRUPOS */}
            {activeTab === "chats" && (
              <>
                {rooms.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30 text-emerald-600" />
                    <p className="text-xs font-semibold">Nenhuma conversa no momento.</p>
                    <p className="text-[11px] mt-1 text-zinc-400">
                      Adicione um contato ou crie um novo grupo para começar!
                    </p>
                  </div>
                ) : (
                  rooms
                    .filter((r) => r.name.toLowerCase().includes(chatSearch.toLowerCase()))
                    .map((room) => {
                      const isSelected = selectedRoomId === room.id;
                      const otherId = !room.isGroup
                        ? room.memberIds.find((id) => id !== currentUser?.id)
                        : null;
                      const isOnline = otherId ? onlineUserIds.has(otherId) : false;

                      return (
                        <div
                          key={room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                            isSelected ? "bg-emerald-50/80 dark:bg-emerald-950/20" : ""
                          }`}
                        >
                          <div className="relative shrink-0">
                            <img
                              src={room.avatar}
                              alt={room.name}
                              className="h-12 w-12 rounded-full object-cover border"
                            />
                            {/* PONTO VERDE (ONLINE) / VERMELHO (OFFLINE) PARA INDIVIDUAIS */}
                            {!room.isGroup && (
                              <span
                                className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                                  isOnline ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm truncate flex items-center gap-1.5">
                                {room.name}
                                {room.isGroup && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                    Grupo
                                  </span>
                                )}
                              </h4>
                              <button
                                onClick={(e) => handleDeleteConversation(room.id, e)}
                                title="Excluir histórico"
                                className="text-zinc-400 hover:text-red-500 p-1 opacity-50 hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                              {room.description || "Toque para abrir a conversa"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                )}
              </>
            )}

            {/* ABA 2: LISTA DE CONTATOS */}
            {activeTab === "contacts" && (
              <div className="p-2 space-y-1">
                {contacts.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs">
                    Nenhum contato adicionado. Clique em "+ Adicionar Contato" no topo.
                  </div>
                ) : (
                  contacts.map((contact) => (
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

            {/* ABA 3: STORIES COM RACHADURAS SEGMENTADAS */}
            {activeTab === "status" && (
              <div className="p-3 space-y-4">
                {/* BOTÃO POSTAR STATUS COM CÂMERA */}
                <div className="flex items-center gap-3 p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50">
                  <div
                    onClick={() => statusCameraInputRef.current?.click()}
                    className="h-12 w-12 rounded-full bg-emerald-600 text-white flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition-colors"
                  >
                    <Camera className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-xs">Postar Story</h5>
                    <p className="text-[11px] text-zinc-500">Foto que dura 24 horas</p>
                  </div>
                  <input
                    ref={statusCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleSelectStatusPhoto}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    onClick={() => statusCameraInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Câmera
                  </Button>
                </div>

                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Atualizações de Stories
                </div>

                {groupedStories.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs">
                    Nenhum story ativo. Seja o primeiro a postar!
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
                        {/* ANEL COM RACHADURAS / SEGMENTOS SVG BASEADO NA QTD */}
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
                        const otherId = activeRoom.memberIds.find((id) => id !== currentUser?.id);
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
                    const isMe = msg.senderId === currentUser?.id;

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
                                className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                {playingAudioId === msg.id ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4 ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-emerald-600 ${
                                      playingAudioId === msg.id ? "animate-pulse w-full" : "w-1/3"
                                    }`}
                                  />
                                </div>
                                <span className="text-[10px] text-zinc-500 mt-1 block">Áudio de voz</span>
                              </div>
                            </div>
                          )}

                          {/* TEXTO */}
                          {msg.type === "text" && (
                            <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>
                          )}

                          {/* RODAPÉ DA MENSAGEM */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                            {msg.isEdited && <span className="italic mr-1">(editada)</span>}
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && <CheckCheck className="h-3 w-3 text-emerald-600" />}
                            <button
                              onClick={() => setSelectedMessageForAction(msg)}
                              className="ml-1 opacity-50 hover:opacity-100"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT INFERIOR FIXO */}
              <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                {isRecording ? (
                  <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/40 p-2 rounded-2xl border border-red-200">
                    <div className="flex items-center gap-2 text-red-600 font-bold text-xs animate-pulse">
                      <div className="h-3 w-3 rounded-full bg-red-600" />
                      Gravando áudio: {recordingSeconds}s
                    </div>
                    <Button
                      size="sm"
                      onClick={stopRecordingAudio}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                    >
                      Parar e Enviar
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
                      title="Enviar Foto da Galeria"
                      className="p-2 text-zinc-500 hover:text-emerald-600 hover:bg-zinc-100 rounded-full transition-colors"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </button>

                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Mensagem..."
                      className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-full text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    />

                    {inputMessage.trim() ? (
                      <button
                        type="submit"
                        className="p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecordingAudio}
                        title="Gravar Áudio"
                        className="p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    )}
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10" />
              </div>
              <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">HS Social Conectado</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                Nenhuma conversa selecionada no momento. Selecione um contato na barra ao lado para iniciar um chat rápido.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: VALIDAÇÃO DE CONTATOS (HS DIGITAL VS SOCIAL) */}
      {/* ============================================================== */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-600" /> Adicionar Contato Real
              </h3>
              <button onClick={() => setShowAddContact(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleValidateAndAddContact} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Número com DDD:
                </label>
                <Input
                  type="tel"
                  required
                  placeholder="Ex: 69999998888 ou 92991000000"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  className="mt-1 text-xs"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  O sistema valida na base da HS Digital se o usuário tem conta ativa.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddContact(false)}
                  className="w-1/2 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isValidatingContact}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  {isValidatingContact ? "Validando..." : "Validar e Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CRIAR GRUPO COM FOTO E PARTICIPANTES */}
      {/* ============================================================== */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> Criar Novo Grupo
              </h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="mt-4 space-y-3">
              {/* Escolha de Foto do Grupo */}
              <div className="flex items-center gap-3">
                <div
                  onClick={() => groupPhotoInputRef.current?.click()}
                  className="h-14 w-14 rounded-full border-2 border-dashed border-emerald-500 overflow-hidden flex items-center justify-center cursor-pointer bg-zinc-50 dark:bg-zinc-800"
                >
                  {groupPhoto ? (
                    <img src={groupPhoto} alt="Foto" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold block">Foto do Grupo</span>
                  <button
                    type="button"
                    onClick={() => groupPhotoInputRef.current?.click()}
                    className="text-[11px] text-emerald-600 hover:underline"
                  >
                    Escolher da Galeria
                  </button>
                </div>
                <input
                  ref={groupPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGroupPhotoUpload}
                  className="hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Nome do Grupo:</label>
                <Input
                  required
                  placeholder="Ex: Família & Amigos 🏡"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Descrição do Grupo:</label>
                <Input
                  placeholder="Regras ou objetivo..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">
                  Selecionar Participantes ({selectedParticipants.length}):
                </label>
                <div className="max-h-28 overflow-y-auto mt-1 border rounded-lg p-2 space-y-1">
                  {contacts.length === 0 ? (
                    <span className="text-[11px] text-zinc-400">Adicione contatos para incluir no grupo.</span>
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
                          className="flex items-center justify-between py-1 cursor-pointer"
                        >
                          <span className="text-xs font-medium">{c.name}</span>
                          <input type="checkbox" checked={isSel} readOnly className="h-3.5 w-3.5" />
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
                  className="w-1/2 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Criar Grupo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: INFORMAÇÕES DO GRUPO (SAIR OU EXCLUIR) */}
      {/* ============================================================== */}
      {viewingGroupInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border text-center">
            <img
              src={viewingGroupInfo.avatar}
              alt={viewingGroupInfo.name}
              className="h-20 w-20 rounded-full mx-auto object-cover border-2 border-emerald-500 mb-2 shadow"
            />
            <h4 className="font-bold text-base">{viewingGroupInfo.name}</h4>
            <p className="text-xs text-zinc-500 mt-1">{viewingGroupInfo.description || "Sem descrição"}</p>
            <span className="text-[11px] text-emerald-600 block mt-1 font-semibold">
              {viewingGroupInfo.memberIds.length} participantes
            </span>

            <div className="mt-6 space-y-2">
              {/* Opção de Sair do Grupo (para membros) */}
              <Button
                variant="outline"
                onClick={() => handleSairDoGrupo(viewingGroupInfo.id)}
                className="w-full text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center justify-center gap-1.5"
              >
                <LogOut className="h-4 w-4" /> Sair do Grupo
              </Button>

              {/* Opção de Excluir Grupo (para administrador) */}
              {viewingGroupInfo.adminId === currentUser?.id && (
                <Button
                  variant="outline"
                  onClick={() => handleExcluirGrupo(viewingGroupInfo.id)}
                  className="w-full text-xs font-bold text-red-600 border-red-300 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Excluir Grupo Permanentemente
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => setViewingGroupInfo(null)}
                className="w-full text-xs text-zinc-500"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: STORIES VIEWER (10s COM PAUSA E BLOQUEIO DE CONTEXTO) */}
      {/* ============================================================== */}
      {activeStoryGroup && (
        <div
          onMouseDown={() => setIsStoryPaused(true)}
          onMouseUp={() => setIsStoryPaused(false)}
          onTouchStart={() => setIsStoryPaused(true)}
          onTouchEnd={() => setIsStoryPaused(false)}
          onContextMenu={(e) => e.preventDefault()} // Bloqueia copiar imagem ao segurar
          className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none"
        >
          <div className="relative w-full h-full md:max-w-sm md:h-[680px] bg-zinc-950 md:rounded-3xl overflow-hidden flex flex-col justify-between">
            {/* Linhas de progresso no topo */}
            <div className="absolute top-3 inset-x-3 z-30 flex gap-1">
              {activeStoryGroup.items.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{
                      width:
                        idx < storyIndex ? "100%" : idx === storyIndex ? `${storyProgress}%` : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Cabeçalho do Story */}
            <div className="absolute top-6 inset-x-4 z-30 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <img
                  src={activeStoryGroup.authorAvatar}
                  alt={activeStoryGroup.authorName}
                  className="h-8 w-8 rounded-full object-cover border border-white"
                />
                <div>
                  <h5 className="font-bold text-xs">{activeStoryGroup.authorName}</h5>
                  <span className="text-[10px] text-zinc-300">
                    {new Date(activeStoryGroup.items[storyIndex].createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveStoryGroup(null)}
                className="p-1 rounded-full bg-black/40 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Imagem do Story com Toque nas laterais para avançar/voltar */}
            <div className="flex-1 flex items-center justify-center bg-black relative">
              <img
                src={activeStoryGroup.items[storyIndex].imageUrl}
                alt="Story"
                className="w-full h-full object-contain pointer-events-none"
              />
              {/* Área lateral esquerda: voltar */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (storyIndex > 0) {
                    setStoryIndex((i) => i - 1);
                    setStoryProgress(0);
                  }
                }}
                className="absolute left-0 top-16 bottom-16 w-1/3"
              />
              {/* Área lateral direita: avançar */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (storyIndex < activeStoryGroup.items.length - 1) {
                    setStoryIndex((i) => i + 1);
                    setStoryProgress(0);
                  } else {
                    setActiveStoryGroup(null);
                  }
                }}
                className="absolute right-0 top-16 bottom-16 w-1/3"
              />
            </div>

            {/* Legenda se houver */}
            {activeStoryGroup.items[storyIndex].caption && (
              <div className="absolute bottom-6 inset-x-4 z-30 p-3 rounded-xl bg-black/60 backdrop-blur-sm text-center text-white text-xs font-medium">
                {activeStoryGroup.items[storyIndex].caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: MENU FLUTUANTE DA MENSAGEM */}
      {/* ============================================================== */}
      {selectedMessageForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-2xl border space-y-2 text-xs">
            <h5 className="font-bold pb-2 border-b">Ações da Mensagem</h5>
            <button
              onClick={handleDeleteMessageForMe}
              className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4 text-zinc-500" /> Apagar para mim
            </button>

            {selectedMessageForAction.senderId === currentUser?.id && (
              <>
                <button
                  onClick={handleDeleteMessageForAll}
                  className="w-full text-left p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 flex items-center gap-2"
                >
                  <Ban className="h-4 w-4" /> Apagar para todos (Cancelar)
                </button>
                {selectedMessageForAction.type === "text" && (
                  <button
                    onClick={() => {
                      setEditingMessageId(selectedMessageForAction.id);
                      setEditMessageText(selectedMessageForAction.content);
                      setSelectedMessageForAction(null);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4 text-emerald-600" /> Editar
                  </button>
                )}
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMessageForAction(null)}
              className="w-full mt-2 text-xs"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: EDITAR MENSAGEM */}
      {/* ============================================================== */}
      {editingMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-2xl border">
            <h5 className="font-bold text-xs pb-2 border-b">Editar Mensagem</h5>
            <Input
              value={editMessageText}
              onChange={(e) => setEditMessageText(e.target.value)}
              className="my-3 text-xs"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingMessageId(null)}
                className="w-1/2 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditMessage}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: PUBLICAR NOVO STATUS */}
      {/* ============================================================== */}
      {showPostStatusModal && statusImageInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-2xl border">
            <h4 className="font-bold text-xs mb-3">Publicar Story (24 Horas)</h4>
            <div className="h-56 rounded-xl overflow-hidden mb-3 border bg-black">
              <img src={statusImageInput} alt="Preview" className="h-full w-full object-contain" />
            </div>
            <Input
              placeholder="Legenda do story..."
              value={statusCaptionInput}
              onChange={(e) => setStatusCaptionInput(e.target.value)}
              className="text-xs mb-3"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPostStatusModal(false);
                  setStatusImageInput(null);
                }}
                className="w-1/2 text-xs"
              >
                Descartar
              </Button>
              <Button
                onClick={handlePostStatusSubmit}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Publicar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 8: PERFIL DO CONTATO */}
      {/* ============================================================== */}
      {viewingProfileContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-zinc-900 p-6 text-center shadow-2xl border">
            <img
              src={viewingProfileContact.avatar}
              alt={viewingProfileContact.name}
              className="h-20 w-20 rounded-full mx-auto object-cover border-2 border-emerald-500 mb-2 shadow"
            />
            <h4 className="font-bold text-base">{viewingProfileContact.name}</h4>
            <p className="text-xs text-zinc-500 mt-0.5">{viewingProfileContact.phone}</p>

            <div className="mt-6 space-y-2">
              <Button
                onClick={() => {
                  startChatWithContact(viewingProfileContact);
                  setViewingProfileContact(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Conversar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const updated = contacts.map((c) =>
                    c.contactId === viewingProfileContact.contactId
                      ? { ...c, isBlocked: !c.isBlocked }
                      : c
                  );
                  setContacts(updated);
                  localStorage.setItem(STORAGE_KEYS.CONTATOS, JSON.stringify(updated));
                  setViewingProfileContact(null);
                  toast.success(
                    viewingProfileContact.isBlocked ? "Contato desbloqueado." : "Contato bloqueado."
                  );
                }}
                className={`w-full text-xs font-bold flex items-center justify-center gap-1.5 ${
                  viewingProfileContact.isBlocked ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <Ban className="h-4 w-4" />
                {viewingProfileContact.isBlocked ? "Desbloquear" : "Bloquear"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setViewingProfileContact(null)}
                className="w-full text-xs text-zinc-500"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
