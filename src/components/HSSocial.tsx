typescript
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Ajuste o caminho se necessário conforme seu projeto
import { Search, Send, User, MessageSquare } from 'lucide-react';

interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
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
  profiles?: Profile; // Dados do outro usuário na conversa
}

export default function HSSocial() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [searchError, setSearchError] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Pegar usuário logado
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  // 2. Carregar conversas recentes
  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, user_one_id, user_two_id
        `)
        .or(`user_one_id.eq.${currentUser.id},user_two_id.eq.${currentUser.id}`);

      if (!error && data) {
        // Buscar o perfil do OUTRO usuário de cada conversa para listar na barra lateral
        const enrichedConversations = await Promise.all(data.map(async (conv: any) => {
          const otherUserId = conv.user_one_id === currentUser.id ? conv.user_two_id : conv.user_one_id;
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', otherUserId)
            .single();
          return { ...conv, profiles: profileData || { id: otherUserId, full_name: 'Usuário HS' } };
        }));
        setConversations(enrichedConversations);
      }
    };

    fetchConversations();
  }, [currentUser]);

  // 3. Carregar mensagens da conversa ativa + Ativar o Realtime (Tempo Real)
  useEffect(() => {
    if (!activeConversation) return;

    // Buscar mensagens antigas
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversation.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    // ESCUTAR NOVAS MENSAGENS EM TEMPO REAL (Pulo do Gato)
    const channel = supabase
      .channel(`chat-${activeConversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation]);

  // Rolar para o final do chat ao receber nova mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Função de buscar usuário por e-mail ou telefone
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);

    if (!searchQuery.trim()) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email, phone')
      .or(`email.eq.${searchQuery},phone.eq.${searchQuery}`)
      .maybeSingle();

    if (error) {
      setSearchError('Erro ao buscar usuário.');
    } else if (!data) {
      setSearchError('Usuário não encontrado.');
    } else {
      if (data.id === currentUser?.id) {
        setSearchError('Você não pode iniciar um chat com você mesmo.');
      } else {
        setSearchResult(data);
      }
    }
  };

  // 5. Iniciar ou abrir uma conversa existente
  const startConversation = async (otherUser: Profile) => {
    if (!currentUser) return;

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user_one_id.eq.${currentUser.id},user_two_id.eq.${otherUser.id}),and(user_one_id.eq.${otherUser.id},user_two_id.eq.${currentUser.id})`)
      .maybeSingle();

    if (existing) {
      setActiveConversation({ ...existing, profiles: otherUser });
    } else {
      // Criar nova se não existir
      const { data: newConv, error } = await supabase
        .from('conversations')
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
    setSearchQuery('');
  };

  // 6. Enviar Mensagem
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !currentUser) return;

    const messageText = newMessage;
    setNewMessage(''); // Limpa o campo na hora na tela

    await supabase.from('messages').insert([
      {
        conversation_id: activeConversation.id,
        sender_id: currentUser.id,
        text: messageText,
      },
    ]);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden dashboard-container">
      {/* COLUNA DA ESQUERDA: BUSCA E LISTA */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Campo de Busca */}
        <form onSubmit={handleSearch} className="p-4 border-b border-gray-100 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por e-mail ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            Buscar
          </button>
        </form>

        {/* Resultado da Busca */}
        {searchError && <p className="text-red-500 text-xs px-4 py-2">{searchError}</p>}
        {searchResult && (
          <div className="p-4 mx-4 my-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              {searchResult.avatar_url ? (
                <img src={searchResult.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><User className="h-5 w-5 text-gray-500" /></div>
              )}
              <div>
                <h4 className="font-semibold text-sm text-gray-800">{searchResult.full_name || 'Usuário'}</h4>
                <p className="text-xs text-gray-500">{searchResult.email}</p>
              </div>
            </div>
            <button onClick={() => startConversation(searchResult)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
              Chamar
            </button>
          </div>
        )}

        {/* Lista de Conversas Ativas */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 px-4 py-3 uppercase tracking-wider">Conversas Recentes</p>
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-500 px-4 text-center mt-4">Nenhuma conversa iniciada ainda.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${activeConversation?.id === conv.id ? 'bg-gray-100' : ''}`}
              >
                {conv.profiles?.avatar_url ? (
                  <img src={conv.profiles.avatar_url} alt="" className="w-11 h-11 rounded-full" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center"><User className="h-5 w-5 text-gray-400" /></div>
                )}
                <div className="flex-1 border-b border-gray-100 pb-2">
                  <h4 className="font-medium text-sm text-gray-900">{conv.profiles?.full_name}</h4>
                  <p className="text-xs text-gray-500 truncate">Clique para abrir o chat</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUNA DA DIREITA: JANELA DO CHAT */}
      <div className="w-2/3 bg-[#f0f2f5] flex flex-col">
        {activeConversation ? (
          <>
            {/* Cabeçalho do Chat */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
              {activeConversation.profiles?.avatar_url ? (
                <img src={activeConversation.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              ) : (
Use o código com cuidado.
)}
{activeConversation.profiles?.full_name}
{/* Balões de Mensagem */}

{messages.map((msg) => {
const isMe = msg.sender_id === currentUser?.id;
return (
<div key={msg.id} className={flex w-full ${isMe ? 'justify-end' : 'justify-start'}}>
<div className={max-w-[70%] px-4 py-2 rounded-lg text-sm shadow-sm ${isMe ? 'bg-[#d9fdd3] text-gray-900' : 'bg-white text-gray-900'}}>
{msg.text}

{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}



);
})}

{/* Campo de Enviar */}

<input
type="text"
placeholder="Digite uma mensagem..."
value={newMessage}
onChange={(e) => setNewMessage(e.target.value)}
className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
/>




</>
) : (


HS Social
Busque por um e-mail ou número cadastrado na barra lateral para começar a trocar mensagens estilo WhatsApp!

)}


);
}
