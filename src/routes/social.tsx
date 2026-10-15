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
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "HS Social · Conversas, Grupos e Status" },
      {
        name: "description",
        content: "Conecte-se com sua família e amigos no HS Social. Chat rápido, fotos, áudios e grupos seguros.",
      },
    ],
  }),
  component: HSSocialPage,
});

// Tipos
interface UserProfile {
  name: string;
  phone: string;
  avatar: string;
  statusText: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  statusText: string;
}

interface Message {
  id: string;
  chatId: string;
  senderPhone: string;
  senderName: string;
  type: "text" | "image" | "audio";
  content: string; // texto, URL de imagem ou base64 de áudio
  timestamp: number;
}

interface ChatRoom {
  id: string;
  isGroup: boolean;
  name: string;
  avatar: string;
  memberPhones: string[];
}

interface StatusItem {
  id: string;
  authorPhone: string;
  authorName: string;
  authorAvatar: string;
  type: "text" | "image";
  content: string;
  caption?: string;
  createdAt: number;
}

const STORAGE_KEYS = {
  PROFILE: "hs_social_my_profile_v1",
  CONTACTS: "hs_social_contacts_v1",
  ROOMS: "hs_social_rooms_v1",
  MESSAGES: "hs_social_messages_v1",
  STATUSES: "hs_social_statuses_v1",
};

export function HSSocialPage() {
  // Estado do Perfil
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: "Hugo",
      phone: "92991000000",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
      statusText: "Disponível no HS Social",
    };
  });

  // Contatos
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "c_esposa",
        name: "Esposa ❤️",
        phone: "92991112222",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop",
        statusText: "Amor da minha vida",
      },
      {
        id: "c_pai",
        name: "Pai",
        phone: "92992223333",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop",
        statusText: "Abençoado por Deus",
      },
      {
        id: "c_irmao",
        name: "Irmão",
        phone: "92993334444",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop",
        statusText: "Focado nos objetivos",
      },
    ];
  });

  // Salas de Chat
  const [rooms, setRooms] = useState<ChatRoom[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "room_esposa",
        isGroup: false,
        name: "Esposa ❤️",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop",
        memberPhones: ["92991112222"],
      },
      {
        id: "room_familia",
        isGroup: true,
        name: "Família Kuster 🏡",
        avatar: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=150&auto=format&fit=crop",
        memberPhones: ["92991112222", "92992223333", "92993334444"],
      },
    ];
  });

  // Mensagens
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "m_1",
        chatId: "room_esposa",
        senderPhone: "92991112222",
        senderName: "Esposa ❤️",
        type: "text",
        content: "Oi amor! Vi que os produtos novos já estão com frete grátis na loja!",
        timestamp: Date.now() - 3600000,
      },
      {
        id: "m_2",
        chatId: "room_familia",
        senderPhone: "92992223333",
        senderName: "Pai",
        type: "text",
        content: "Boa noite família! Deus abençoe a todos nós.",
        timestamp: Date.now() - 7200000,
      },
    ];
  });

  // Status de 24 horas
  const [statuses, setStatuses] = useState<StatusItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATUSES);
      if (saved) {
        const parsed: StatusItem[] = JSON.parse(saved);
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return parsed.filter((s) => s.createdAt > dayAgo);
      }
    } catch {}
    return [
      {
        id: "st_1",
        authorPhone: "92991112222",
        authorName: "Esposa ❤️",
        authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop",
        type: "text",
        content: "Dia abençoado! Gratidão a Deus por tudo 🙏✨",
        createdAt: Date.now() - 1000 * 60 * 60 * 4,
      },
    ];
  });

  // Salvar alterações no storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(statuses));
  }, [statuses]);

  // Navegação e Modais
  const [activeTab, setActiveTab] = useState<"chats" | "status" | "profile">("chats");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("room_esposa");
  const [chatSearch, setChatSearch] = useState("");

  // Modais de Criação
  const [showAddContact, setShowAddContact] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [showAddStatus, setShowAddStatus] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [viewingStatus, setViewingStatus] = useState<StatusItem | null>(null);

  // Input de Mensagem
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  const activeRoomMessages = useMemo(() => {
    if (!activeRoom) return [];
    return messages.filter((m) => m.chatId === activeRoom.id);
  }, [messages, activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeRoomMessages]);

  // Enviar Mensagem de Texto
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !activeRoom) return;
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      chatId: activeRoom.id,
      senderPhone: profile.phone,
      senderName: profile.name,
      type: "text",
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");
  };

  // Enviar Foto
  const handleSendPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newMsg: Message = {
        id: `msg_${Date.now()}`,
        chatId: activeRoom.id,
        senderPhone: profile.phone,
        senderName: profile.name,
        type: "image",
        content: reader.result as string,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newMsg]);
      toast.success("Foto enviada!");
    };
    reader.readAsDataURL(file);
  };

  // Gravar Áudio
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!activeRoom) return;
          const newMsg: Message = {
            id: `msg_${Date.now()}`,
            chatId: activeRoom.id,
            senderPhone: profile.phone,
            senderName: profile.name,
            type: "audio",
            content: reader.result as string,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, newMsg]);
          toast.success("Áudio gravado e enviado!");
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Permissão de microfone negada ou indisponível.");
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Adicionar Contato por Celular
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newPhone.replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      toast.error("Digite um telefone válido.");
      return;
    }
    const nameFinal = newName.trim() || `Contato (${cleanPhone.slice(-4)})`;
    const newContact: Contact = {
      id: `c_${Date.now()}`,
      name: nameFinal,
      phone: cleanPhone,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`,
      statusText: "Disponível no HS Social",
    };

    const newRoom: ChatRoom = {
      id: `room_${cleanPhone}`,
      isGroup: false,
      name: nameFinal,
      avatar: newContact.avatar,
      memberPhones: [cleanPhone],
    };

    setContacts((prev) => [...prev, newContact]);
    setRooms((prev) => [newRoom, ...prev]);
    setSelectedRoomId(newRoom.id);
    setNewName("");
    setNewPhone("");
    setShowAddContact(false);
    toast.success(`${nameFinal} adicionado à sua lista!`);
  };

  // Criar Grupo
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembers.length === 0) {
      toast.error("Escolha um nome e ao menos 1 participante.");
      return;
    }
    const newRoom: ChatRoom = {
      id: `group_${Date.now()}`,
      isGroup: true,
      name: newGroupName.trim(),
      avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop",
      memberPhones: selectedMembers,
    };

    setRooms((prev) => [newRoom, ...prev]);
    setSelectedRoomId(newRoom.id);
    setNewGroupName("");
    setSelectedMembers([]);
    setShowCreateGroup(false);
    toast.success(`Grupo "${newRoom.name}" criado!`);
  };

  // Postar Status de 24h
  const handlePostStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusText.trim()) return;
    const newSt: StatusItem = {
      id: `st_${Date.now()}`,
      authorPhone: profile.phone,
      authorName: profile.name,
      authorAvatar: profile.avatar,
      type: "text",
      content: statusText.trim(),
      createdAt: Date.now(),
    };
    setStatuses((prev) => [newSt, ...prev]);
    setStatusText("");
    setShowAddStatus(false);
    toast.success("Seu status foi publicado (expira em 24h)!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-2 sm:px-4 py-3 sm:py-6">
        {/* Contêiner Estilo Mensageiro Moderno */}
        <div className="h-[calc(100vh-140px)] min-h-[550px] rounded-2xl border border-border bg-card shadow-lg flex overflow-hidden">
          {/* PAINEL LATERAL ESQUERDO */}
          <div
            className={`w-full md:w-[360px] lg:w-[400px] border-r border-border flex flex-col bg-card/60 ${
              selectedRoomId && "hidden md:flex"
            }`}
          >
            {/* Header Lateral com Abas */}
            <div className="p-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] font-bold">
                    HS
                  </div>
                  <div>
                    <h1 className="font-black text-sm tracking-tight text-foreground flex items-center gap-1.5">
                      HS Social
                      <span className="text-[10px] font-semibold bg-[#10b981]/15 text-[#10b981] px-1.5 py-0.2 rounded-full">
                        Online
                      </span>
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Adicionar por Celular"
                    onClick={() => setShowAddContact(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Criar Novo Grupo"
                    onClick={() => setShowCreateGroup(true)}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Botões das 3 Abas */}
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("chats")}
                  className={`py-1.5 rounded-lg transition ${
                    activeTab === "chats" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Conversas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("status")}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                    activeTab === "status" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Status
                  {statuses.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className={`py-1.5 rounded-lg transition ${
                    activeTab === "profile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Meu Perfil
                </button>
              </div>

              {/* Barra de Busca de Conversas */}
              {activeTab === "chats" && (
                <div className="mt-2.5 relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Pesquisar conversas ou contatos..."
                    className="h-8 pl-8 text-xs bg-background/80"
                  />
                </div>
              )}
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {/* ABA 1: CONVERSAS */}
              {activeTab === "chats" && (
                <div>
                  {rooms
                    .filter((r) => r.name.toLowerCase().includes(chatSearch.toLowerCase()))
                    .map((room) => {
                      const roomMsgs = messages.filter((m) => m.chatId === room.id);
                      const lastMsg = roomMsgs[roomMsgs.length - 1];

                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoomId(room.id)}
                          className={`w-full text-left p-3 flex items-center gap-3 transition hover:bg-muted/40 ${
                            selectedRoomId === room.id ? "bg-muted/70 border-l-4 border-[#10b981]" : ""
                          }`}
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border">
                            <img src={room.avatar} alt={room.name} className="h-full w-full object-cover" />
                            {room.isGroup && (
                              <div className="absolute bottom-0 right-0 bg-[#10b981] p-0.5 rounded-full text-white">
                                <Users className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-xs text-foreground truncate">{room.name}</p>
                              {lastMsg && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(lastMsg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {lastMsg ? (
                                lastMsg.type === "image" ? (
                                  "📷 Foto"
                                ) : lastMsg.type === "audio" ? (
                                  "🎤 Mensagem de áudio"
                                ) : (
                                  lastMsg.content
                                )
                              ) : (
                                "Nenhuma mensagem ainda"
                              )}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* ABA 2: STATUS DE 24 HORAS */}
              {activeTab === "status" && (
                <div className="p-3 space-y-4">
                  {/* Meu Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-full border-2 border-dashed border-[#10b981] p-0.5">
                        <img src={profile.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Meu Status</p>
                        <p className="text-[10px] text-muted-foreground">Poste uma foto ou mensagem para 24h</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddStatus(true)}
                      className="h-8 bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Postar
                    </Button>
                  </div>

                  {/* Lista de Status Recentes */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Atualizações recentes
                    </p>
                    {statuses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum status postado nas últimas 24 horas.</p>
                    ) : (
                      <div className="space-y-2">
                        {statuses.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setViewingStatus(st)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition text-left"
                          >
                            <div className="h-11 w-11 rounded-full border-2 border-[#10b981] p-0.5 shrink-0">
                              <img src={st.authorAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground">{st.authorName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{st.content}</p>
                              <span className="text-[9px] text-[#10b981]">
                                Expira às {new Date(st.createdAt + 24 * 3600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 3: PERFIL DO USUÁRIO */}
              {activeTab === "profile" && (
                <div className="p-4 space-y-4">
                  <div className="text-center">
                    <div className="relative mx-auto h-20 w-20 rounded-full border-2 border-[#10b981] overflow-hidden shadow-md">
                      <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Foto do Perfil</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-semibold text-foreground">Seu Nome:</label>
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground">Seu Celular (identificador):</label>
                      <Input
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, "") })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground">Link da Foto (Avatar):</label>
                      <Input
                        value={profile.avatar}
                        onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                        className="mt-1 h-8 text-xs"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground">Recado / Status:</label>
                      <Input
                        value={profile.statusText}
                        onChange={(e) => setProfile({ ...profile, statusText: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => toast.success("Perfil atualizado com sucesso!")}
                    className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs h-9"
                  >
                    Salvar Perfil
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ÁREA PRINCIPAL DA CONVERSA (DIREITA) */}
          <div className={`flex-1 flex flex-col bg-muted/10 ${!selectedRoomId && "hidden md:flex"}`}>
            {activeRoom ? (
              <>
                {/* Header da Conversa Ativa */}
                <div className="p-3 border-b border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8 -ml-1 text-muted-foreground"
                      onClick={() => setSelectedRoomId("")}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <div className="h-10 w-10 rounded-full overflow-hidden border border-border">
                      <img src={activeRoom.avatar} alt={activeRoom.name} className="h-full w-full object-cover" />
                    </div>

                    <div>
                      <h2 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                        {activeRoom.name}
                      </h2>
                      <p className="text-[10px] text-muted-foreground">
                        {activeRoom.isGroup
                          ? `${activeRoom.memberPhones.length + 1} membros`
                          : "Online no HS Social"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Mensagens da Conversa */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
                  {activeRoomMessages.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">
                      Nenhuma mensagem nessa conversa. Diga olá! 👋
                    </div>
                  ) : (
                    activeRoomMessages.map((msg) => {
                      const isMe = msg.senderPhone === profile.phone;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl p-3 shadow-sm text-xs ${
                              isMe
                                ? "bg-[#10b981] text-white rounded-tr-none"
                                : "bg-card text-foreground border border-border rounded-tl-none"
                            }`}
                          >
                            {/* Nome do remetente em grupos */}
                            {activeRoom.isGroup && !isMe && (
                              <p className="text-[10px] font-bold text-[#10b981] mb-1">{msg.senderName}</p>
                            )}

                            {/* Conteúdo de Texto */}
                            {msg.type === "text" && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                            {/* Conteúdo de Imagem */}
                            {msg.type === "image" && (
                              <div className="rounded-lg overflow-hidden border border-black/10 my-1 max-w-xs">
                                <img src={msg.content} alt="Foto enviada" className="w-full object-cover" />
                              </div>
                            )}

                            {/* Conteúdo de Áudio */}
                            {msg.type === "audio" && (
                              <div className="flex items-center gap-2 py-1">
                                <audio controls src={msg.content} className="h-8 w-48 sm:w-56" />
                              </div>
                            )}

                            {/* Timestamp e Confirmação */}
                            <div
                              className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                                isMe ? "text-white/80" : "text-muted-foreground"
                              }`}
                            >
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isMe && <CheckCheck className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Barra de Digitação e Ações */}
                <div className="p-2 sm:p-3 bg-card border-t border-border flex items-center gap-2">
                  {/* Botão de Envio de Foto */}
                  <label className="cursor-pointer p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition">
                    <ImageIcon className="h-5 w-5" />
                    <input type="file" accept="image/*" onChange={handleSendPhoto} className="hidden" />
                  </label>

                  {/* Campo de Texto */}
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Escreva sua mensagem..."
                    className="flex-1 text-xs h-10 bg-background"
                  />

                  {/* Botão de Gravação de Áudio */}
                  <Button
                    type="button"
                    size="icon"
                    variant={isRecording ? "destructive" : "ghost"}
                    onClick={isRecording ? stopRecordingAudio : startRecordingAudio}
                    className={`h-10 w-10 rounded-full ${
                      isRecording ? "animate-pulse" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={isRecording ? "Clique para finalizar e enviar áudio" : "Gravar áudio"}
                  >
                    {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  {/* Botão de Enviar */}
                  <Button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="h-10 w-10 rounded-full bg-[#10b981] hover:bg-[#059669] text-white p-0 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-[#10b981]/15 text-[#10b981] flex items-center justify-center mb-3">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Nenhuma conversa selecionada</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Escolha um contato ou crie um grupo na barra lateral para começar a conversar.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL 1: ADICIONAR POR TELEFONE */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#10b981]" /> Adicionar Contato por Celular
              </h3>
              <button onClick={() => setShowAddContact(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Número de Telefone (com DDD):</label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ex: 92991234567"
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-foreground">Nome ou Parentesco (ex: Esposa, Pai):</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome do contato"
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddContact(false)} className="w-1/2 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="w-1/2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs">
                  Adicionar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CRIAR GRUPO */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-[#10b981]" /> Criar Novo Grupo
              </h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground">Nome do Grupo:</label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ex: Família Kuster, Amigos, etc."
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Selecione os Participantes:</label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border border-border rounded-xl p-2 bg-muted/20">
                  {contacts.map((c) => {
                    const isChecked = selectedMembers.includes(c.phone);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedMembers((m) => m.filter((p) => p !== c.phone));
                            } else {
                              setSelectedMembers((m) => [...m, c.phone]);
                            }
                          }}
                          className="rounded text-[#10b981] focus:ring-[#10b981]"
                        />
                        <div className="h-7 w-7 rounded-full overflow-hidden border">
                          <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                        </div>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateGroup(false)} className="w-1/2 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="w-1/2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs">
                  Criar Grupo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: POSTAR STATUS */}
      {showAddStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm">Postar Status (24 horas)</h3>
              <button onClick={() => setShowAddStatus(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePostStatus} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Sua mensagem ou pensamento:</label>
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="No que você está pensando hoje?"
                  className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-[#10b981] h-24"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddStatus(false)} className="w-1/2 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="w-1/2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs">
                  Publicar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VISUALIZAR STATUS */}
      {viewingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-xs rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white text-center shadow-2xl">
            <button
              onClick={() => setViewingStatus(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto h-16 w-16 rounded-full border-2 border-[#10b981] p-1 mb-3">
              <img src={viewingStatus.authorAvatar} alt="" className="h-full w-full rounded-full object-cover" />
            </div>

            <h4 className="font-bold text-sm">{viewingStatus.authorName}</h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Postado às {new Date(viewingStatus.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>

            <div className="mt-6 p-4 rounded-xl bg-zinc-800/80 border border-zinc-700/60 min-h-[120px] flex items-center justify-center">
              <p className="text-sm font-medium leading-relaxed">{viewingStatus.content}</p>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
