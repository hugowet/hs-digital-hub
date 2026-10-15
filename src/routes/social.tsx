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
  Video,
  X,
  Play,
  Pause,
  Edit2,
  Ban,
  MessageSquare,
  Info,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "HS Social · Conversas, Grupos e Status" },
      {
        name: "description",
        content: "Conecte-se com sua família e amigos no HS Social. Chat profissional com persistência e status 24h.",
      },
    ],
  }),
  component: HSSocialPage,
});

// Tipos de Dados
interface SocialProfile {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  statusText: string;
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
  senderPhone?: string;
  type: "text" | "image" | "audio";
  content: string;
  mediaUrl?: string;
  timestamp: number;
  isEdited?: boolean;
  deletedForAll?: boolean;
  deletedForMe?: boolean;
}

interface SocialRoom {
  id: string;
  isGroup: boolean;
  name: string;
  description?: string;
  avatar: string;
  adminId?: string;
  memberIds: string[];
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: number;
}

interface SocialStatus {
  id: string;
  userId: string;
  authorName: string;
  authorPhone?: string;
  authorAvatar: string;
  imageUrl: string;
  caption?: string;
  createdAt: number;
}

export function HSSocialPage() {
  // 1. Usuário Atual
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<SocialProfile>({
    id: "",
    name: "Você",
    phone: "",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
    statusText: "Disponível no HS Social",
  });

  // Presença Online em Tempo Real
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // 2. Navegação Principal - OBRIGATÓRIO iniciar sem sala selecionada (null)
  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "status" | "profile">("chats");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState("");

  // Dados do Aplicativo
  const [rooms, setRooms] = useState<SocialRoom[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [statuses, setStatuses] = useState<SocialStatus[]>([]);

  // Modais e Detalhes
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  // Perfil Detalhado do Contato / Grupo
  const [viewingProfileContact, setViewingProfileContact] = useState<ContactItem | null>(null);
  const [viewingGroupDetails, setViewingGroupDetails] = useState<SocialRoom | null>(null);

  // Status / Stories Viewer
  const [showPostStatusModal, setShowPostStatusModal] = useState(false);
  const [statusImageInput, setStatusImageInput] = useState<string | null>(null);
  const [statusCaptionInput, setStatusCaptionInput] = useState("");
  const [viewingStoriesUser, setViewingStoriesUser] = useState<{ authorName: string; avatar: string; items: SocialStatus[] } | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  // Mensagens e Ações (Toque Longo / Menu)
  const [inputMessage, setInputMessage] = useState("");
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<SocialMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");

  // Áudio Gravador
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

  // Obter usuário logado e perfil
  useEffect(() => {
    async function loadAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fallback local se não logado
        const localUid = localStorage.getItem("hs_temp_uid") || "hs_user_" + Math.random().toString(36).substring(2, 9);
        localStorage.setItem("hs_temp_uid", localUid);
        setCurrentUser({ id: localUid });
        setMyProfile({
          id: localUid,
          name: "Usuário HS",
          phone: "69999990000",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
          statusText: "Disponível no HS Social",
        });
        return;
      }

      setCurrentUser(user);

      // Buscar perfil na tabela profiles
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (prof) {
        setMyProfile({
          id: user.id,
          name: prof.full_name || user.email?.split("@")[0] || "Usuário HS",
          phone: prof.phone || "",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
          statusText: "Disponível no HS Social",
        });
      }
    }
    loadAuth();
  }, []);

  // Presença em Tempo Real com Supabase Presence
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

  // Carregar dados de salas e contatos
  useEffect(() => {
    if (!currentUser?.id) return;

    // Buscar contatos
    async function fetchContactsAndRooms() {
      // 1. Contatos
      const { data: contactRows } = await supabase
        .from("social_contacts" as any)
        .select("*")
        .eq("user_id", currentUser.id);

      if (contactRows && contactRows.length > 0) {
        setContacts(
          contactRows.map((c: any) => ({
            id: c.id,
            contactId: c.contact_id,
            name: c.contact_name,
            phone: c.contact_phone,
            avatar: c.contact_avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
            isBlocked: c.is_blocked || false,
          }))
        );
      }

      // 2. Salas
      const { data: roomRows } = await supabase
        .from("social_rooms" as any)
        .select("*")
        .or(`member_ids.cs.{${currentUser.id}},admin_id.eq.${currentUser.id}`);

      if (roomRows && roomRows.length > 0) {
        setRooms(
          roomRows.map((r: any) => ({
            id: r.id,
            isGroup: r.is_group,
            name: r.name,
            description: r.description,
            avatar: r.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
            adminId: r.admin_id,
            memberIds: r.member_ids || [],
          }))
        );
      }

      // 3. Status 24h
      const { data: statusRows } = await supabase
        .from("social_statuses" as any)
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (statusRows && statusRows.length > 0) {
        setStatuses(
          statusRows.map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            authorName: s.author_name,
            authorPhone: s.author_phone,
            authorAvatar: s.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
            imageUrl: s.image_url,
            caption: s.caption,
            createdAt: new Date(s.created_at).getTime(),
          }))
        );
      }
    }

    fetchContactsAndRooms();

    // Inscrição em Tempo Real para Novas Salas
    const roomsChannel = supabase
      .channel("realtime-social-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_rooms" }, () => {
        fetchContactsAndRooms();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "social_statuses" }, () => {
        fetchContactsAndRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, [currentUser?.id]);

  // Carregar e sincronizar mensagens da sala ativa
  useEffect(() => {
    if (!selectedRoomId || !currentUser?.id) return;

    async function loadRoomMessages() {
      const { data: msgRows } = await supabase
        .from("social_messages" as any)
        .select("*")
        .eq("room_id", selectedRoomId)
        .order("created_at", { ascending: true });

      if (msgRows) {
        setMessages(
          msgRows
            .filter((m: any) => !m.deleted_by_users?.includes(currentUser.id))
            .map((m: any) => ({
              id: m.id,
              roomId: m.room_id,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderPhone: m.sender_phone,
              type: m.type,
              content: m.deleted_for_all ? "🚫 Esta mensagem foi apagada" : m.content,
              mediaUrl: m.media_url,
              timestamp: new Date(m.created_at).getTime(),
              isEdited: m.is_edited,
              deletedForAll: m.deleted_for_all,
            }))
        );
      }
    }

    loadRoomMessages();

    // Escutar mensagens em tempo real
    const msgChannel = supabase
      .channel(`room-${selectedRoomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_messages", filter: `room_id=eq.${selectedRoomId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const m = payload.new;
            if (!m.deleted_by_users?.includes(currentUser.id)) {
              setMessages((prev) => [
                ...prev,
                {
                  id: m.id,
                  roomId: m.room_id,
                  senderId: m.sender_id,
                  senderName: m.sender_name,
                  senderPhone: m.sender_phone,
                  type: m.type,
                  content: m.deleted_for_all ? "🚫 Esta mensagem foi apagada" : m.content,
                  mediaUrl: m.media_url,
                  timestamp: new Date(m.created_at).getTime(),
                  isEdited: m.is_edited,
                  deletedForAll: m.deleted_for_all,
                },
              ]);
            }
          } else if (payload.eventType === "UPDATE") {
            const m = payload.new;
            setMessages((prev) =>
              prev.map((item) =>
                item.id === m.id
                  ? {
                      ...item,
                      content: m.deleted_for_all ? "🚫 Esta mensagem foi apagada" : m.content,
                      isEdited: m.is_edited,
                      deletedForAll: m.deleted_for_all,
                    }
                  : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [selectedRoomId, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // A sala atualmente selecionada
  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  // Verificar se o contato da conversa está online
  const isRecipientOnline = useMemo(() => {
    if (!activeRoom || activeRoom.isGroup) return false;
    const otherId = activeRoom.memberIds.find((id) => id !== currentUser?.id);
    return otherId ? onlineUserIds.has(otherId) : false;
  }, [activeRoom, currentUser?.id, onlineUserIds]);

  // 1. Validação REAL de Telefone ao Adicionar Contato
  const handleAddContactByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newContactPhone.replace(/\D/g, "");

    if (cleanPhone.length < 10) {
      toast.error("Informe um número de telefone válido com DDD (ex: 69999998888)");
      return;
    }

    // Bloquear números fictícios óbvios
    if (/^(\d)\1+$/.test(cleanPhone) || cleanPhone === "12345678901") {
      toast.error("Número inválido ou fictício. Digite um telefone real.");
      return;
    }

    setIsSearchingPhone(true);
    try {
      // Busca direta na tabela profiles do Supabase
      const { data: userProfile, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .ilike("phone", `%${cleanPhone}%`)
        .maybeSingle();

      if (error || !userProfile) {
        toast.error("Usuário não encontrado na base de dados da HS Digital. Verifique se ele possui conta cadastrada.");
        setIsSearchingPhone(false);
        return;
      }

      if (userProfile.id === currentUser?.id) {
        toast.error("Você não pode adicionar seu próprio número como contato.");
        setIsSearchingPhone(false);
        return;
      }

      // Salvar na tabela social_contacts
      const contactName = userProfile.full_name || `Contato (${cleanPhone})`;
      const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop";

      await supabase.from("social_contacts" as any).upsert({
        user_id: currentUser.id,
        contact_id: userProfile.id,
        contact_name: contactName,
        contact_phone: userProfile.phone || cleanPhone,
        contact_avatar: defaultAvatar,
        is_blocked: false,
      });

      // Atualizar lista local
      setContacts((prev) => [
        {
          id: userProfile.id,
          contactId: userProfile.id,
          name: contactName,
          phone: userProfile.phone || cleanPhone,
          avatar: defaultAvatar,
          isBlocked: false,
        },
        ...prev.filter((c) => c.contactId !== userProfile.id),
      ]);

      toast.success(`${contactName} adicionado aos contatos!`);
      setShowAddContact(false);
      setNewContactPhone("");
    } catch (err: any) {
      toast.error("Erro ao validar telefone: " + (err.message || "Tente novamente."));
    } finally {
      setIsSearchingPhone(false);
    }
  };

  // Iniciar conversa direta com um contato
  const handleStartChatWithContact = async (contact: ContactItem) => {
    if (contact.isBlocked) {
      toast.error("Você bloqueou este contato. Desbloqueie-o para conversar.");
      return;
    }

    // Verificar se já existe sala 1:1
    const existing = rooms.find(
      (r) => !r.isGroup && r.memberIds.includes(currentUser.id) && r.memberIds.includes(contact.contactId)
    );

    if (existing) {
      setSelectedRoomId(existing.id);
      setActiveTab("chats");
      return;
    }

    // Criar nova sala no Supabase
    const { data: newRoom, error } = await supabase
      .from("social_rooms" as any)
      .insert({
        is_group: false,
        name: contact.name,
        avatar_url: contact.avatar,
        admin_id: currentUser.id,
        member_ids: [currentUser.id, contact.contactId],
      })
      .select()
      .single();

    if (!error && newRoom) {
      const roomObj: SocialRoom = {
        id: newRoom.id,
        isGroup: false,
        name: contact.name,
        avatar: contact.avatar,
        adminId: currentUser.id,
        memberIds: [currentUser.id, contact.contactId],
      };
      setRooms((prev) => [roomObj, ...prev]);
      setSelectedRoomId(roomObj.id);
    } else {
      // Fallback local se a tabela estiver em configuração
      const localId = "room_" + Date.now();
      const localObj: SocialRoom = {
        id: localId,
        isGroup: false,
        name: contact.name,
        avatar: contact.avatar,
        memberIds: [currentUser.id, contact.contactId],
      };
      setRooms((prev) => [localObj, ...prev]);
      setSelectedRoomId(localId);
    }

    setActiveTab("chats");
  };

  // 2. Exclusão de Conversa (Limpeza Completa do Histórico)
  const handleDeleteConversation = async (roomId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!confirm("Deseja apagar esta conversa? O histórico será zerado.")) return;

    try {
      // Apagar mensagens enviadas ou marcar deleted_by_users
      await supabase
        .from("social_messages" as any)
        .delete()
        .eq("room_id", roomId);

      // Remover a sala da lista do usuário
      setRooms((prev) => prev.filter((r) => r.id !== roomId));

      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
      }

      toast.success("Conversa excluída com sucesso.");
    } catch (err) {
      toast.error("Erro ao excluir conversa.");
    }
  };

  // 3. Bloqueio e Desbloqueio de Contatos
  const handleToggleBlockContact = async (contact: ContactItem) => {
    const nextStatus = !contact.isBlocked;
    try {
      await supabase
        .from("social_contacts" as any)
        .update({ is_blocked: nextStatus })
        .eq("user_id", currentUser.id)
        .eq("contact_id", contact.contactId);

      setContacts((prev) =>
        prev.map((c) => (c.contactId === contact.contactId ? { ...c, isBlocked: nextStatus } : c))
      );

      if (viewingProfileContact?.contactId === contact.contactId) {
        setViewingProfileContact((prev) => (prev ? { ...prev, isBlocked: nextStatus } : null));
      }

      toast.success(nextStatus ? `${contact.name} foi bloqueado.` : `${contact.name} foi desbloqueado.`);
    } catch {
      toast.error("Erro ao alterar bloqueio.");
    }
  };

  // 4. Envio de Mensagem de Texto
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedRoomId || !currentUser?.id) return;

    const textToSend = inputMessage.trim();
    setInputMessage("");

    try {
      const { data, error } = await supabase.from("social_messages" as any).insert({
        room_id: selectedRoomId,
        sender_id: currentUser.id,
        sender_name: myProfile.name,
        sender_phone: myProfile.phone,
        type: "text",
        content: textToSend,
        deleted_by_users: [],
      }).select().single();

      if (error) {
        // Fallback local se tabela não migrada
        const fallbackMsg: SocialMessage = {
          id: "m_" + Date.now(),
          roomId: selectedRoomId,
          senderId: currentUser.id,
          senderName: myProfile.name,
          type: "text",
          content: textToSend,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } catch {
      toast.error("Erro ao enviar mensagem.");
    }
  };

  // Envio de Foto na Conversa
  const handleSendImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoomId || !currentUser?.id) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;

      try {
        await supabase.from("social_messages" as any).insert({
          room_id: selectedRoomId,
          sender_id: currentUser.id,
          sender_name: myProfile.name,
          sender_phone: myProfile.phone,
          type: "image",
          content: "Foto enviada",
          media_url: base64Url,
          deleted_by_users: [],
        });
      } catch {
        // Fallback local
        const fallbackMsg: SocialMessage = {
          id: "img_" + Date.now(),
          roomId: selectedRoomId,
          senderId: currentUser.id,
          senderName: myProfile.name,
          type: "image",
          content: "Foto enviada",
          mediaUrl: base64Url,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // 5. Gravação e Envio de Áudio Real (MediaRecorder)
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = async () => {
          const audioBase64 = reader.result as string;

          if (selectedRoomId && currentUser?.id) {
            await supabase.from("social_messages" as any).insert({
              room_id: selectedRoomId,
              sender_id: currentUser.id,
              sender_name: myProfile.name,
              type: "audio",
              content: "Mensagem de voz",
              media_url: audioBase64,
              deleted_by_users: [],
            });
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Permissão de microfone negada ou indisponível.");
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

  // 6. Ações em Mensagens: Toque Longo / Menu Flutuante
  const handleOpenMessageMenu = (msg: SocialMessage, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedMessageForAction(msg);
  };

  const handleDeleteMessageForMe = async () => {
    if (!selectedMessageForAction || !currentUser?.id) return;
    try {
      await supabase
        .from("social_messages" as any)
        .update({
          deleted_by_users: supabase.rpc("array_append", {
            arr: "deleted_by_users",
            val: currentUser.id,
          } as any),
        })
        .eq("id", selectedMessageForAction.id);

      setMessages((prev) => prev.filter((m) => m.id !== selectedMessageForAction.id));
      toast.success("Mensagem apagada para você.");
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== selectedMessageForAction.id));
    } finally {
      setSelectedMessageForAction(null);
    }
  };

  const handleDeleteMessageForAll = async () => {
    if (!selectedMessageForAction) return;
    if (selectedMessageForAction.senderId !== currentUser?.id) {
      toast.error("Você só pode apagar para todos as mensagens que você enviou.");
      return;
    }

    try {
      await supabase
        .from("social_messages" as any)
        .update({ deleted_for_all: true, content: "🚫 Esta mensagem foi apagada" })
        .eq("id", selectedMessageForAction.id);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedMessageForAction.id
            ? { ...m, deletedForAll: true, content: "🚫 Esta mensagem foi apagada" }
            : m
        )
      );
      toast.success("Mensagem cancelada para todos.");
    } catch {
      toast.error("Erro ao apagar mensagem para todos.");
    } finally {
      setSelectedMessageForAction(null);
    }
  };

  const handleStartEditMessage = () => {
    if (!selectedMessageForAction) return;
    if (selectedMessageForAction.senderId !== currentUser?.id) {
      toast.error("Você só pode editar suas próprias mensagens.");
      return;
    }
    setEditingMessageId(selectedMessageForAction.id);
    setEditMessageText(selectedMessageForAction.content);
    setSelectedMessageForAction(null);
  };

  const handleSaveEditedMessage = async () => {
    if (!editingMessageId || !editMessageText.trim()) return;

    try {
      await supabase
        .from("social_messages" as any)
        .update({ content: editMessageText.trim(), is_edited: true })
        .eq("id", editingMessageId);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId ? { ...m, content: editMessageText.trim(), isEdited: true } : m
        )
      );
      toast.success("Mensagem atualizada.");
    } catch {
      toast.error("Erro ao atualizar mensagem.");
    } finally {
      setEditingMessageId(null);
      setEditMessageText("");
    }
  };

  // 7. Sistema de Status (24h) com Câmera e Stories de 10s
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

  const handlePublishStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusImageInput || !currentUser?.id) return;

    try {
      const { data, error } = await supabase.from("social_statuses" as any).insert({
        user_id: currentUser.id,
        author_name: myProfile.name,
        author_phone: myProfile.phone,
        avatar_url: myProfile.avatar,
        image_url: statusImageInput,
        caption: statusCaptionInput,
      }).select().single();

      if (!error && data) {
        setStatuses((prev) => [
          {
            id: data.id,
            userId: currentUser.id,
            authorName: myProfile.name,
            authorPhone: myProfile.phone,
            authorAvatar: myProfile.avatar,
            imageUrl: statusImageInput,
            caption: statusCaptionInput,
            createdAt: Date.now(),
          },
          ...prev,
        ]);
      } else {
        // Fallback local
        setStatuses((prev) => [
          {
            id: "st_" + Date.now(),
            userId: currentUser.id,
            authorName: myProfile.name,
            authorAvatar: myProfile.avatar,
            imageUrl: statusImageInput,
            caption: statusCaptionInput,
            createdAt: Date.now(),
          },
          ...prev,
        ]);
      }

      toast.success("Status postado! Ele sumirá em 24 horas.");
      setShowPostStatusModal(false);
      setStatusImageInput(null);
      setStatusCaptionInput("");
    } catch {
      toast.error("Erro ao publicar status.");
    }
  };

  // Agrupamento de Status por Usuário (evita duplicar nomes na lista)
  const groupedStatusesByUser = useMemo(() => {
    const map = new Map<string, { authorName: string; avatar: string; items: SocialStatus[] }>();
    statuses.forEach((st) => {
      if (!map.has(st.userId)) {
        map.set(st.userId, {
          authorName: st.authorName,
          avatar: st.authorAvatar,
          items: [],
        });
      }
      map.get(st.userId)!.items.push(st);
    });
    return Array.from(map.entries()).map(([userId, data]) => ({ userId, ...data }));
  }, [statuses]);

  // Player de Stories (10 segundos por tela com pausa ao pressionar)
  useEffect(() => {
    if (!viewingStoriesUser) return;

    if (isStoryPaused) return;

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Próximo story do usuário
          if (storyIndex < viewingStoriesUser.items.length - 1) {
            setStoryIndex((i) => i + 1);
            return 0;
          } else {
            // Fim dos stories
            setViewingStoriesUser(null);
            setStoryIndex(0);
            return 0;
          }
        }
        return prev + 1; // 1% a cada 100ms = 10 segundos
      });
    }, 100);

    return () => clearInterval(interval);
  }, [viewingStoriesUser, storyIndex, isStoryPaused]);

  const openStories = (group: { authorName: string; avatar: string; items: SocialStatus[] }) => {
    setViewingStoriesUser(group);
    setStoryIndex(0);
    setStoryProgress(0);
    setIsStoryPaused(false);
  };

  // 8. Criação de Grupos com Administrador e Permissões
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !currentUser?.id) return;

    const allMemberIds = Array.from(new Set([currentUser.id, ...selectedGroupMembers]));
    const defaultGroupAvatar =
      groupAvatar || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop";

    try {
      const { data, error } = await supabase.from("social_rooms" as any).insert({
        is_group: true,
        name: groupName.trim(),
        description: groupDesc.trim() || "Grupo criado no HS Social",
        avatar_url: defaultGroupAvatar,
        admin_id: currentUser.id,
        member_ids: allMemberIds,
      }).select().single();

      const newGroupObj: SocialRoom = {
        id: data?.id || "grp_" + Date.now(),
        isGroup: true,
        name: groupName.trim(),
        description: groupDesc.trim(),
        avatar: defaultGroupAvatar,
        adminId: currentUser.id,
        memberIds: allMemberIds,
      };

      setRooms((prev) => [newGroupObj, ...prev]);
      setSelectedRoomId(newGroupObj.id);
      setShowCreateGroup(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedGroupMembers([]);
      toast.success("Grupo criado com sucesso!");
    } catch {
      toast.error("Erro ao criar grupo.");
    }
  };

  return (
    // FIXAÇÃO TOTAL: h-[100dvh] sem transbordamento, sem rodapé padrão HS Digital
    <div className="flex flex-col h-[100dvh] w-full bg-[#f0f2f5] dark:bg-zinc-950 overflow-hidden font-sans select-none">
      {/* CABEÇALHO DO SITE (HS DIGITAL) */}
      <div className="shrink-0">
        <SiteHeader />
      </div>

      {/* ÁREA PRINCIPAL DO APLICATIVO HS SOCIAL */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================== */}
        {/* BARRA LATERAL (LISTA DE CONVERSAS / CONTATOS / STATUS) */}
        {/* ============================================================== */}
        <div
          className={`w-full md:w-[380px] lg:w-[420px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 ${
            selectedRoomId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* TOPO DA BARRA LATERAL COM PERFIL E ABAS */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                onClick={() => setActiveTab("profile")}
                className="relative cursor-pointer hover:opacity-85 transition-opacity"
              >
                <img src={myProfile.avatar} alt="Perfil" className="h-10 w-10 rounded-full object-cover border" />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-none">{myProfile.name}</h3>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {myProfile.phone ? `(${myProfile.phone})` : "HS Social"}
                </span>
              </div>
            </div>

            {/* BOTÕES DE AÇÕES RÁPIDAS */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddContact(true)}
                title="Adicionar Contato por Telefone"
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                title="Criar Comunidade / Grupo"
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
          </div>

          {/* ABAS: CONVERSAS, CONTATOS, STATUS */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold bg-zinc-50 dark:bg-zinc-900">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "chats"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Conversas
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "contacts"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Contatos ({contacts.length})
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "status"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Status
            </button>
          </div>

          {/* BARRA DE PESQUISA */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Pesquisar conversas ou contatos..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* LISTA ROLÁVEL (CONVERSAS / CONTATOS / STATUS) */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {/* ABA 1: CONVERSAS */}
            {activeTab === "chats" && (
              <>
                {rooms.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40 text-emerald-600" />
                    <p className="text-xs font-medium">Nenhuma conversa iniciada.</p>
                    <p className="text-[11px] mt-1">Clique em "Adicionar Contato" para buscar pelo telefone com DDD.</p>
                  </div>
                ) : (
                  rooms
                    .filter((r) => r.name.toLowerCase().includes(chatSearch.toLowerCase()))
                    .map((room) => {
                      const isSelected = selectedRoomId === room.id;
                      const otherMemberId = !room.isGroup
                        ? room.memberIds.find((id) => id !== currentUser?.id)
                        : null;
                      const isOnline = otherMemberId ? onlineUserIds.has(otherMemberId) : false;

                      return (
                        <div
                          key={room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                            isSelected ? "bg-emerald-50/70 dark:bg-emerald-950/20" : ""
                          }`}
                        >
                          <div className="relative shrink-0">
                            <img
                              src={room.avatar}
                              alt={room.name}
                              className="h-12 w-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                            {/* PONTO ONLINE VERDE OU OFFLINE VERMELHO */}
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
                              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                                {room.name}
                                {room.isGroup && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                                    Grupo
                                  </span>
                                )}
                              </h4>
                              <button
                                onClick={(e) => handleDeleteConversation(room.id, e)}
                                title="Excluir conversa (zerar histórico)"
                                className="text-zinc-400 hover:text-red-500 p-1 opacity-60 hover:opacity-100 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {room.description || "Toque para abrir a conversa"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                )}
              </>
            )}

            {/* ABA 2: LISTA DE CONTATOS SALVOS */}
            {activeTab === "contacts" && (
              <div className="p-2 space-y-1">
                <div className="p-2 text-xs font-bold text-zinc-400 uppercase tracking-wider flex justify-between">
                  <span>Seus Contatos ({contacts.length})</span>
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="text-emerald-600 hover:underline capitalize"
                  >
                    + Novo
                  </button>
                </div>

                {contacts.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs">
                    Nenhum contato salvo. Adicione parentes ou amigos pelo número de telefone cadastrado na plataforma!
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.contactId}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                          <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                            {contact.name}
                            {contact.isBlocked && (
                              <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">Bloqueado</span>
                            )}
                          </h5>
                          <span className="text-[11px] text-zinc-500">{contact.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartChatWithContact(contact)}
                          className="h-8 px-2 text-xs text-emerald-600 font-semibold"
                        >
                          Conversar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABA 3: STATUS 24H */}
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
                    <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Meu Status</h5>
                    <p className="text-[11px] text-zinc-500">Compartilhe uma foto que some em 24h</p>
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
                    Postar
                  </Button>
                </div>

                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Atualizações Recentes
                </div>

                {groupedStatusesByUser.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs">
                    Nenhum status recente nas últimas 24 horas. Seja o primeiro a postar!
                  </div>
                ) : (
                  groupedStatusesByUser.map((group) => (
                    <div
                      key={group.userId}
                      onClick={() => openStories(group)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                    >
                      {/* CÍRCULO VERDE AO REDOR DO PERFIL */}
                      <div className="relative p-0.5 rounded-full border-2 border-emerald-500">
                        <img
                          src={group.avatar}
                          alt={group.authorName}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {group.authorName}
                        </h4>
                        <span className="text-[10px] text-zinc-500">
                          {group.items.length} {group.items.length === 1 ? "foto" : "fotos"} disponíveis
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* ÁREA CENTRAL DO CHAT / CONVERSA FIXA */}
        {/* ============================================================== */}
        <div className={`flex-1 bg-[#efeae2] dark:bg-zinc-950 flex flex-col min-w-0 ${selectedRoomId ? "flex" : "hidden md:flex"}`}>
          {activeRoom ? (
            <>
              {/* CABEÇALHO DO CHAT ATIVO */}
              <div className="h-16 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedRoomId(null)}
                    className="md:hidden p-1.5 -ml-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>

                  <div
                    onClick={() => {
                      if (activeRoom.isGroup) {
                        setViewingGroupDetails(activeRoom);
                      } else {
                        const otherId = activeRoom.memberIds.find((id) => id !== currentUser?.id);
                        const contactObj = contacts.find((c) => c.contactId === otherId);
                        if (contactObj) setViewingProfileContact(contactObj);
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
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 transition-colors">
                        {activeRoom.name}
                      </h4>
                      {/* PONTO VERDE SE ATIVO, PONTO VERMELHO SE OFFLINE */}
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
                        <span className="text-[11px] text-zinc-400">
                          {activeRoom.memberIds.length} participantes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* OPÇÕES DA CONVERSA */}
                <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                  <button
                    onClick={() => handleDeleteConversation(activeRoom.id)}
                    title="Excluir Histórico da Conversa"
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* FLUXO DE MENSAGENS COM ROLAGEM DEDICADA */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-4 rounded-2xl text-center max-w-sm shadow-sm border border-zinc-200/50">
                      <Shield className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                      <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                        Início da conversa com {activeRoom.name}
                      </h5>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        As mensagens, áudios e fotos são sincronizados em tempo real via Supabase.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser?.id;

                    return (
                      <div
                        key={msg.id}
                        onContextMenu={(e) => handleOpenMessageMenu(msg, e)}
                        className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-sm text-xs transition-all ${
                            isMe
                              ? "bg-[#d9fdd3] dark:bg-emerald-950 text-zinc-900 dark:text-zinc-100 rounded-tr-none"
                              : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800"
                          }`}
                        >
                          {/* Nome do remetente em grupos */}
                          {activeRoom.isGroup && !isMe && (
                            <span className="block font-bold text-[10px] text-emerald-700 dark:text-emerald-400 mb-1">
                              {msg.senderName}
                            </span>
                          )}

                          {/* TIPO: FOTO */}
                          {msg.type === "image" && msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-h-64 border border-black/10">
                              <img src={msg.mediaUrl} alt="Foto enviada" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {/* TIPO: ÁUDIO NATIVO COM CONTROLE */}
                          {msg.type === "audio" && msg.mediaUrl && (
                            <div className="flex items-center gap-3 py-1 min-w-[200px]">
                              <button
                                onClick={() => togglePlayAudio(msg.id, msg.mediaUrl)}
                                className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-700 transition-colors"
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

                          {/* TIPO: TEXTO */}
                          {msg.type === "text" && (
                            <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>
                          )}

                          {/* RODAPÉ DA MENSAGEM: HORA E STATUS */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                            {msg.isEdited && <span className="italic mr-1">(editada)</span>}
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && <CheckCheck className="h-3 w-3 text-emerald-600" />}

                            {/* Botão de menu flutuante / toque longo */}
                            <button
                              onClick={(e) => handleOpenMessageMenu(msg, e)}
                              className="ml-1 opacity-60 hover:opacity-100"
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

              {/* CAMPO DE ENTRADA FIXO NA BASE */}
              <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                {/* GRAVAÇÃO DE ÁUDIO ATIVA */}
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
                    {/* ENVIAR FOTO */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSendImage}
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

                    {/* CAMPO DE TEXTO */}
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Mensagem..."
                      className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-full text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                    />

                    {/* BOTÃO DE ÁUDIO OU ENVIAR TEXTO */}
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
                        title="Gravar Áudio de Voz"
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
            // TELA INICIAL QUANDO NENHUMA SALA ESTÁ SELECIONADA
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-4 shadow-inner">
                <MessageSquare className="h-10 w-10" />
              </div>
              <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">HS Social Conectado</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                Envie mensagens, fotos e áudios em tempo real com sua família e contatos salvos no marketplace.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button
                  onClick={() => setShowAddContact(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" /> Adicionar Contato
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateGroup(true)}
                  className="text-xs font-bold"
                >
                  <Users className="h-4 w-4 mr-1.5" /> Criar Grupo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: ADICIONAR CONTATO POR TELEFONE COM DDD */}
      {/* ============================================================== */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-600" /> Adicionar Contato
              </h3>
              <button onClick={() => setShowAddContact(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddContactByPhone} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Número de Telefone com DDD:
                </label>
                <Input
                  type="tel"
                  required
                  placeholder="Ex: 69999998888 ou 92991000000"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="mt-1 text-xs"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  O sistema valida se o usuário possui conta real cadastrada na plataforma.
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
                  disabled={isSearchingPhone}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  {isSearchingPhone ? "Validando..." : "Localizar e Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CRIAR GRUPO COM ADMIN E FOTO */}
      {/* ============================================================== */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> Criar Grupo / Comunidade
              </h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nome do Grupo:</label>
                <Input
                  required
                  placeholder="Ex: Família Silva 🏡"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Descrição:</label>
                <Input
                  placeholder="Regras ou objetivo do grupo..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Selecionar Participantes ({selectedGroupMembers.length}):
                </label>
                <div className="max-h-32 overflow-y-auto mt-1 border rounded-lg p-2 space-y-1.5 divide-y divide-zinc-100">
                  {contacts.map((c) => {
                    const isSelected = selectedGroupMembers.includes(c.contactId);
                    return (
                      <div
                        key={c.contactId}
                        onClick={() => {
                          setSelectedGroupMembers((prev) =>
                            isSelected ? prev.filter((id) => id !== c.contactId) : [...prev, c.contactId]
                          );
                        }}
                        className="flex items-center justify-between pt-1 cursor-pointer"
                      >
                        <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{c.name}</span>
                        <input type="checkbox" checked={isSelected} readOnly className="h-3.5 w-3.5" />
                      </div>
                    );
                  })}
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
      {/* MODAL 3: PERFIL DETALHADO DO CONTATO COM BLOQUEIO */}
      {/* ============================================================== */}
      {viewingProfileContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-zinc-900 p-6 text-center shadow-2xl border">
            <div className="relative mx-auto h-24 w-24 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md mb-3">
              <img
                src={viewingProfileContact.avatar}
                alt={viewingProfileContact.name}
                className="h-full w-full object-cover"
              />
            </div>
            <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">{viewingProfileContact.name}</h4>
            <p className="text-xs text-zinc-500 mt-0.5">{viewingProfileContact.phone}</p>

            <div className="mt-6 space-y-2">
              <Button
                onClick={() => {
                  handleStartChatWithContact(viewingProfileContact);
                  setViewingProfileContact(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Abrir Conversa
              </Button>
              <Button
                variant="outline"
                onClick={() => handleToggleBlockContact(viewingProfileContact)}
                className={`w-full text-xs font-bold flex items-center justify-center gap-1.5 ${
                  viewingProfileContact.isBlocked ? "text-emerald-600 border-emerald-600" : "text-red-600 border-red-300"
                }`}
              >
                <Ban className="h-4 w-4" />
                {viewingProfileContact.isBlocked ? "Desbloquear Contato" : "Bloquear Contato"}
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

      {/* ============================================================== */}
      {/* MODAL 4: MENU FLUTUANTE DA MENSAGEM (TOQUE LONGO / CLIQUE) */}
      {/* ============================================================== */}
      {selectedMessageForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-2xl border space-y-2 text-xs">
            <h5 className="font-bold text-zinc-700 dark:text-zinc-200 pb-2 border-b">Opções da Mensagem</h5>
            <button
              onClick={handleDeleteMessageForMe}
              className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center gap-2"
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
                    onClick={handleStartEditMessage}
                    className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center gap-2"
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
      {/* MODAL 5: EDITAR MENSAGEM */}
      {/* ============================================================== */}
      {editingMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-2xl border">
            <h5 className="font-bold text-xs pb-2 border-b">Corrigir Mensagem</h5>
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
                onClick={handleSaveEditedMessage}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: PUBLICAR STATUS FOTO (24 HORAS) */}
      {/* ============================================================== */}
      {showPostStatusModal && statusImageInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-2xl border">
            <h4 className="font-bold text-xs mb-3 text-zinc-800 dark:text-zinc-200">Publicar no Status (24 Horas)</h4>
            <div className="h-56 rounded-xl overflow-hidden mb-3 border bg-black">
              <img src={statusImageInput} alt="Preview" className="h-full w-full object-contain" />
            </div>
            <Input
              placeholder="Adicionar legenda..."
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
                onClick={handlePublishStatus}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Publicar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: STORIES VIEWER ESTILO WHATSAPP (10s COM PAUSA) */}
      {/* ============================================================== */}
      {viewingStoriesUser && (
        <div
          onMouseDown={() => setIsStoryPaused(true)}
          onMouseUp={() => setIsStoryPaused(false)}
          onTouchStart={() => setIsStoryPaused(true)}
          onTouchEnd={() => setIsStoryPaused(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black p-0 md:p-6 select-none"
        >
          <div className="relative w-full h-full md:max-w-sm md:h-[680px] bg-zinc-950 md:rounded-3xl overflow-hidden flex flex-col justify-between">
            {/* BARRA DE PROGRESSO SUPERIOR */}
            <div className="absolute top-3 inset-x-3 z-30 flex gap-1">
              {viewingStoriesUser.items.map((_, idx) => (
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

            {/* TOPO COM AUTOR E FECHAR */}
            <div className="absolute top-6 inset-x-4 z-30 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <img
                  src={viewingStoriesUser.avatar}
                  alt={viewingStoriesUser.authorName}
                  className="h-8 w-8 rounded-full object-cover border border-white"
                />
                <div>
                  <h5 className="font-bold text-xs">{viewingStoriesUser.authorName}</h5>
                  <span className="text-[10px] text-zinc-300">
                    {new Date(viewingStoriesUser.items[storyIndex].createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingStoriesUser(null)}
                className="p-1 rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* IMAGEM DO STATUS */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-black">
              <img
                src={viewingStoriesUser.items[storyIndex].imageUrl}
                alt="Status"
                className="w-full h-full object-contain"
              />
            </div>

            {/* LEGENDA SE HOUVER */}
            {viewingStoriesUser.items[storyIndex].caption && (
              <div className="absolute bottom-6 inset-x-4 z-30 p-3 rounded-xl bg-black/60 backdrop-blur-sm text-center text-white text-xs font-medium">
                {viewingStoriesUser.items[storyIndex].caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
