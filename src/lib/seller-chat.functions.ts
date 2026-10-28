import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SellerConversation = {
  id: string;
  productId: string;
  productTitle: string;
  buyerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
};

export type SellerChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

// Comprador inicia (ou reutiliza) a conversa sobre um produto e envia a primeira mensagem.
export const sendSellerMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string; body: string }) => {
    if (!data?.productId || !data.body?.trim()) throw new Error("Mensagem inválida.");
    if (data.body.length > 2000) throw new Error("Mensagem muito longa (máximo 2000 caracteres).");
    return { productId: data.productId, body: data.body.trim() };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, store_id, stores!inner(owner_id)")
      .eq("id", data.productId)
      .maybeSingle();
    if (productError || !product) throw new Error("Produto não encontrado.");

    const ownerId = (product as any).stores?.owner_id as string | null;
    if (ownerId === userId) throw new Error("Este produto é da sua própria loja.");

    const { data: conversation, error: convError } = await supabase
      .from("product_conversations")
      .upsert(
        { product_id: data.productId, store_id: product.store_id, buyer_id: userId, updated_at: new Date().toISOString() },
        { onConflict: "product_id,buyer_id" },
      )
      .select("id")
      .single();
    if (convError || !conversation) throw new Error("Não foi possível abrir a conversa com o vendedor.");

    const { error: msgError } = await supabase
      .from("product_messages")
      .insert({ conversation_id: conversation.id, sender_id: userId, body: data.body });
    if (msgError) throw new Error("Não foi possível enviar a mensagem.");

    return { conversationId: conversation.id as string };
  });

// Vendedor lista as conversas recebidas na sua loja.
export const listSellerConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SellerConversation[]> => {
    const { supabase, userId } = context;

    const { data: store } = await supabase.from("stores").select("id").eq("owner_id", userId).maybeSingle();
    if (!store) return [];

    const { data: conversations, error } = await supabase
      .from("product_conversations")
      .select("id, product_id, buyer_id, updated_at, products(title)")
      .eq("store_id", store.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error || !conversations?.length) return [];

    const ids = conversations.map((c) => c.id);
    const buyerIds = [...new Set(conversations.map((c) => c.buyer_id))];

    const [{ data: messages }, { data: profiles }] = await Promise.all([
      supabase
        .from("product_messages")
        .select("conversation_id, sender_id, body, read_at, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").in("id", buyerIds),
    ]);

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Comprador"]));
    const byConversation = new Map<string, { last: string; at: string; unread: number }>();
    for (const m of messages ?? []) {
      const entry = byConversation.get(m.conversation_id) ?? { last: "", at: "", unread: 0 };
      if (!entry.at) {
        entry.last = m.body;
        entry.at = m.created_at;
      }
      if (!m.read_at && m.sender_id !== userId) entry.unread += 1;
      byConversation.set(m.conversation_id, entry);
    }

    return conversations.map((c) => ({
      id: c.id,
      productId: c.product_id,
      productTitle: (c as any).products?.title ?? "Produto",
      buyerName: nameById.get(c.buyer_id) ?? "Comprador",
      lastMessage: byConversation.get(c.id)?.last ?? "",
      lastMessageAt: byConversation.get(c.id)?.at ?? c.updated_at,
      unread: byConversation.get(c.id)?.unread ?? 0,
    }));
  });

// Participante (comprador ou dono da loja) lê as mensagens da conversa.
export const listSellerChatMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string }) => {
    if (!data?.conversationId) throw new Error("Conversa inválida.");
    return data;
  })
  .handler(async ({ context, data }): Promise<SellerChatMessage[]> => {
    const { supabase, userId } = context;

    const { data: conversation } = await supabase
      .from("product_conversations")
      .select("id, buyer_id, store_id, stores!inner(owner_id)")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conversation) throw new Error("Conversa não encontrada.");
    const isParticipant = conversation.buyer_id === userId || (conversation as any).stores?.owner_id === userId;
    if (!isParticipant) throw new Error("Você não participa desta conversa.");

    const { data: messages, error: messagesError } = await supabase
      .from("product_messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (messagesError) throw new Error("Não foi possível ler as mensagens.");

    // Marca como lidas as mensagens enviadas pela outra parte.
    const { error: readError } = await supabase
      .from("product_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .neq("sender_id", userId)
      .is("read_at", null);
    if (readError) throw new Error("Não foi possível confirmar a leitura das mensagens.");

    return (messages ?? []).map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at }));
  });

// Participante responde dentro de uma conversa existente.
export const replySellerChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string; body: string }) => {
    if (!data?.conversationId || !data.body?.trim()) throw new Error("Mensagem inválida.");
    if (data.body.length > 2000) throw new Error("Mensagem muito longa (máximo 2000 caracteres).");
    return { conversationId: data.conversationId, body: data.body.trim() };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: conversation } = await supabase
      .from("product_conversations")
      .select("id, buyer_id, stores!inner(owner_id)")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conversation) throw new Error("Conversa não encontrada.");
    const isParticipant = conversation.buyer_id === userId || (conversation as any).stores?.owner_id === userId;
    if (!isParticipant) throw new Error("Você não participa desta conversa.");

    const { error } = await supabase
      .from("product_messages")
      .insert({ conversation_id: data.conversationId, sender_id: userId, body: data.body });
    if (error) throw new Error("Não foi possível enviar a mensagem.");

    await supabase
      .from("product_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);

    return { ok: true };
  });
