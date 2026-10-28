import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UnreadDot } from "@/components/unread-dot";
import {
  listSellerConversations,
  listSellerChatMessages,
  replySellerChat,
  type SellerConversation,
} from "@/lib/seller-chat.functions";

export function SellerMessagesTab() {
  const queryClient = useQueryClient();
  const listConversations = useServerFn(listSellerConversations);
  const listMessages = useServerFn(listSellerChatMessages);
  const reply = useServerFn(replySellerChat);

  const [activeConversation, setActiveConversation] = useState<SellerConversation | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["seller-conversations", userId],
    enabled: Boolean(userId),
    queryFn: () => listConversations(),
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["seller-conversation", activeConversation?.id],
    enabled: !!activeConversation,
    queryFn: async () => {
      if (!activeConversation || document.visibilityState !== "visible") return [];
      const result = await listMessages({ data: { conversationId: activeConversation.id } });
      void queryClient.invalidateQueries({ queryKey: ["message-unread"] });
      void queryClient.invalidateQueries({ queryKey: ["seller-conversations"] });
      return result;
    },
    refetchInterval: 8000,
  });

  // Atualiza em tempo real quando chega mensagem nova.
  useEffect(() => {
    const channel = supabase
      .channel(`seller-chat-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "product_messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["seller-conversations"] });
        void queryClient.invalidateQueries({ queryKey: ["seller-conversation"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  async function handleReply() {
    const body = draft.trim();
    if (!body || !activeConversation || sending) return;
    setSending(true);
    try {
      await reply({ data: { conversationId: activeConversation.id, body } });
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["seller-conversation", activeConversation.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  }

  if (activeConversation) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveConversation(null)} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{activeConversation.buyerName}</p>
            <p className="truncate text-xs text-muted-foreground">{activeConversation.productTitle}</p>
          </div>
        </div>
        <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === userId ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.senderId === userId
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}
        </div>
        <div className="flex items-end gap-2 border-t border-border p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Responder ao comprador..."
            maxLength={2000}
            rows={2}
            className="min-h-11"
          />
          <Button onClick={() => void handleReply()} disabled={!draft.trim() || sending} size="icon" aria-label="Enviar resposta">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando mensagens...</p>}
      {!isLoading && conversations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma mensagem de comprador ainda. Quando alguém tocar em "Fale com o vendedor" num produto seu, a conversa aparece aqui.
          </p>
        </div>
      )}
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => setActiveConversation(c)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted/50"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold">{c.buyerName}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {new Date(c.lastMessageAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{c.productTitle}</p>
            <p className="mt-0.5 truncate text-xs text-foreground/80">{c.lastMessage}</p>
          </div>
          <UnreadDot show={c.unread > 0} />
        </button>
      ))}
    </div>
  );
}
