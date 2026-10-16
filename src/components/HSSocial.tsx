import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Send, User, MessageSquare, Clock, PlusCircle } from "lucide-react";

interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

interface Conversation {
  id: string;
  user_one_id: string;
  user_two_id: string;
  profiles?: Profile;
}

interface SocialStatus {
  id: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

const STATUS_STORAGE_KEY = "hs_social_status_24h";

export default function HSSocial() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [searchError, setSearchError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [statuses, setStatuses] = useState<SocialStatus[]>([]);
  const [newStatusText, setNewStatusText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Identificar usuário logado de forma resiliente a multi-sessão
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Carregar status válidos (estritamente 24 horas)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STATUS_STORAGE_KEY);
      if (stored) {
        const parsed: SocialStatus[] = JSON.parse(stored);
        const agora = Date.now();
        const validos = parsed.filter((s) => agora - s.createdAt < 24 * 60 * 60 * 1000);
        setStatuses(validos);
        localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(validos));
      }
    } catch {
      setStatuses([]);
    }
  }, []);

  // 3. Buscar conversas existentes
  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, user_one_id, user_two_id")
        .or(`user_one_id.eq.${currentUser.id},user_two_id.eq.${currentUser.id}`);

      if (!error && data) {
        const enrichedConversations = await Promise.all(
          data.map(async (conv: any) => {
            const otherUserId = conv.user_one_id === currentUser.id ? conv.user_two_id : conv.user_one_id;
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id, full_name, phone")
              .eq("id", otherUserId)
              .maybeSingle();

            return {
              ...conv,
              profiles: profileData || { id: otherUserId, full_name: "Usuário HS" },
            };
          })
        );
        setConversations(enrichedConversations);
      }
    };

    fetchConversations();
  }, [currentUser]);

  // 4. Realtime das mensagens
  useEffect(() => {
    if (!activeConversation) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversation.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 5. Busca resiliente por Nome, Telefone ou CPF
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setSearchResult(null);

    const termo = searchQuery.trim();
    if (!termo) return;

    const apenasNumeros = termo.replace(/\D/g, "");

    try {
      let query = supabase.from("profiles").select("id, full_name, phone");

      if (apenasNumeros.length >= 8) {
        query = query.or(`phone.ilike.%${apenasNumeros}%,full_name.ilike.%${termo}%`);
      } else {
        query = query.ilike("full_name", `%${termo}%`);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        console.error(error);
        setSearchError("Erro ao consultar a base de usuários.");
        return;
      }

      if (!data) {
        setSearchError("Nenhum usuário localizado na base da HS Digital.");
        return;
      }

      if (data.id === currentUser?.id) {
        setSearchError("Você já está nesta conta.");
        return;
      }

      setSearchResult({
        id: data.id,
        full_name: data.full_name ?? "Usuário HS Digital",
        phone: data.phone ?? undefined,
      });
    } catch {
      setSearchError("Falha momentânea na conexão. Tente novamente.");
    }
  };

  const startConversation = async (otherUser: Profile) => {
    if (!currentUser) return;

    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `and(user_one_id.eq.${currentUser.id},user_two_id.eq.${otherUser.id}),and(user_one_id.eq.${otherUser.id},user_two_id.eq.${currentUser.id})`
      )
      .maybeSingle();

    if (existing) {
      setActiveConversation({ ...existing, profiles: otherUser });
    } else {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert([{ user_one_id: currentUser.id, user_two_id: otherUser.id }])
        .select()
        .single();

      if (!error && newConv) {
        const fullConv = { ...newConv, profiles: otherUser };
        setConversations((prev) => [fullConv, ...prev]);
        setActiveConversation(fullConv);
      }
    }
    setSearchResult(null);
    setSearchQuery("");
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !currentUser) return;

    const textToSend = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert([
      {
        conversation_id: activeConversation.id,
        sender_id: currentUser.id,
        text: textToSend,
      },
    ]);
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusText.trim() || !currentUser) return;

    const novo: SocialStatus = {
      id: "st_" + Date.now(),
      userId: currentUser.id,
      authorName: currentUser.user_metadata?.full_name || "Você",
      content: newStatusText.trim(),
      createdAt: Date.now(),
    };

    const atualizados = [novo, ...statuses];
    setStatuses(atualizados);
    try {
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(atualizados.slice(0, 20)));
    } catch {}
    setNewStatusText("");
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      {/* BARRA LATERAL */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Bloco de Status 24h */}
        <div className="p-3 border-b border-gray-100 bg-blue-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Status 24h
            </span>
          </div>
          <form onSubmit={handleAddStatus} className="flex gap-1.5 mb-2">
            <input
              type="text"
              placeholder="O que está acontecendo?"
              value={newStatusText}
              onChange={(e) => setNewStatusText(e.target.value)}
              maxLength={120}
              className="flex-1 px-2.5 py-1 text-xs border border-blue-200 rounded-md focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {statuses.length === 0 ? (
              <span className="text-[11px] text-gray-500">Nenhum status ativo no momento.</span>
            ) : (
              statuses.map((st) => (
                <div
                  key={st.id}
                  className="shrink-0 bg-white border border-blue-200 rounded-lg p-2 text-xs max-w-[140px] shadow-2xs"
                >
                  <p className="font-semibold text-blue-950 truncate">{st.authorName}</p>
                  <p className="text-gray-600 line-clamp-2 text-[10px] mt-0.5">{st.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Busca por E-mail / Celular / CPF */}
        <form onSubmit={handleSearch} className="p-4 border-b border-gray-100 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Buscar
          </button>
        </form>

        {searchError && <p className="text-red-500 text-xs px-4 py-2">{searchError}</p>}
        {searchResult && (
          <div className="p-3 mx-4 my-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-800">{searchResult.full_name}</h4>
              </div>
            </div>
            <button
              onClick={() => startConversation(searchResult)}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Conectar
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 px-4 py-3 uppercase">Conversas</p>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConversation(conv)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                activeConversation?.id === conv.id ? "bg-gray-100" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1 border-b border-gray-100 pb-2">
                <h4 className="font-medium text-sm text-gray-900">{conv.profiles?.full_name}</h4>
                <p className="text-xs text-gray-500 truncate">Clique para abrir o chat</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA CENTRAL DO CHAT */}
      <div className="w-2/3 bg-[#efeae2] flex flex-col">
        {activeConversation ? (
          <>
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <h3 className="font-semibold text-sm text-gray-800">
                {activeConversation.profiles?.full_name}
              </h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-lg text-sm shadow-2xs ${
                        isMe ? "bg-[#d9fdd3]" : "bg-white"
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center">
              <input
                type="text"
                placeholder="Digite uma mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none"
              />
              <button type="submit" className="p-2 bg-blue-600 text-white rounded-full">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <MessageSquare className="h-12 w-12 text-gray-300" />
            <h3 className="font-semibold text-lg">HS Social</h3>
            <p className="text-sm">Busque um usuário ao lado para iniciar a conversa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
