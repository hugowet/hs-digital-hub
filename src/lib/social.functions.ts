import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSocialHome = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [rooms, people, me, stories, messages] = await Promise.all([
      db.from("social_conversations").select("*").order("created_at", { ascending: false }),
      db.rpc("social_contact_profiles"),
      db.from("profiles").select("id,full_name,phone,avatar_url").eq("id", context.userId).single(),
      db.from("social_stories").select("*").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(100),
      db.from("social_messages").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    for (const result of [rooms, people, me, stories, messages]) if (result.error) throw new Error(result.error.message);
    const storyRows = [];
    for (const story of stories.data ?? []) {
      let mediaUrl: string | null = null;
      if (story.media_path) {
        const seconds = Math.max(1, Math.min(300, Math.floor((Date.parse(story.expires_at) - Date.now()) / 1000)));
        const { data, error } = await db.storage.from("social-stories").createSignedUrl(story.media_path, seconds);
        if (error) throw new Error("Não foi possível abrir a foto do story.");
        mediaUrl = data.signedUrl;
      }
      storyRows.push({ ...story, mediaUrl });
    }
    const access = await db.rpc("club_has_access", { _user_id: context.userId });
    if (access.error) throw access.error;
    // Only profile rows already authorized by the authenticated contact RPC enter signing.
    const { supabaseAdmin }=await import("@/integrations/supabase/client.server");
    const {signSocialAvatar}=await import("./social-avatar.server");
    const contacts=await Promise.all((people.data??[]).map(async person=>({...person,avatar_url:await signSocialAvatar(supabaseAdmin,person)})));
    const ownAvatar=await signSocialAvatar(supabaseAdmin,me.data);
    return { me: { ...me.data, avatar_url:ownAvatar, is_clube_hs: access.data }, people: contacts, rooms: rooms.data ?? [], stories: storyRows, recentMessages: messages.data ?? [] };
  });

export const openSocialConversation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ phone: z.string().min(8).max(25) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("social_open_by_phone", { _phone: data.phone });
    if (result.error) throw new Error(result.error.message);
    const room = result.data?.[0];
    if (!room) throw new Error("Perfil não encontrado.");
    return room;
  });

export const openSocialConversationByUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("social_open_by_user", { _user_id: data.userId });
    if (result.error) throw new Error(result.error.message);
    const room = result.data?.[0];
    if (!room) throw new Error("Perfil não encontrado.");
    return room;
  });

export const getSocialMessages = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.from("social_messages").select("*")
      .eq("conversation_id", data.conversationId).order("created_at", { ascending: false }).limit(200);
    if (result.error) throw new Error(result.error.message);
    return (result.data ?? []).reverse();
  });

export const sendSocialMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversationId: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.from("social_messages").insert({
      conversation_id: data.conversationId, sender_id: context.userId, content: data.content,
    }).select().single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const publishSocialStory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ caption: z.string().trim().max(500), mediaPath: z.string().max(200).nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("social_publish_story", { _caption: data.caption, _media_path: data.mediaPath ?? undefined });
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const deleteSocialStory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: story, error } = await context.supabase.from("social_stories").select("*")
      .eq("id", data.storyId).eq("user_id", context.userId).single();
    if (error || !story) throw new Error("Story não disponível.");
    const deleted = await context.supabase.from("social_stories").delete().eq("id", story.id);
    if (deleted.error) throw new Error(deleted.error.message);
    if (story.media_path) {
      const removed = await context.supabase.storage.from("social-stories").remove([story.media_path]);
      if (removed.error) throw new Error("Story removido; não foi possível limpar a foto.");
    }
    return { ok: true };
  });

export const editSocialMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ messageId: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.from("social_messages")
      .update({ content: data.content, edited_at: new Date().toISOString() })
      .eq("id", data.messageId).eq("sender_id", context.userId).eq("kind", "text").select().single();
    if (result.error) throw new Error("Não foi possível editar a mensagem.");
    return result.data;
  });

export const deleteSocialMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ messageId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: msg, error } = await context.supabase.from("social_messages").select("id, media_path")
      .eq("id", data.messageId).eq("sender_id", context.userId).single();
    if (error || !msg) throw new Error("Mensagem não disponível.");
    const deleted = await context.supabase.from("social_messages").delete().eq("id", msg.id);
    if (deleted.error) throw new Error(deleted.error.message);
    if (msg.media_path) await context.supabase.storage.from("social-stories").remove([msg.media_path]);
    return { ok: true };
  });

export const deleteSocialConversation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const msgs = await context.supabase.from("social_messages").select("media_path")
      .eq("conversation_id", data.conversationId).not("media_path", "is", null);
    const deleted = await context.supabase.from("social_conversations").delete().eq("id", data.conversationId);
    if (deleted.error) throw new Error("Não foi possível apagar a conversa.");
    const paths = (msgs.data ?? []).map((m) => m.media_path).filter(Boolean) as string[];
    if (paths.length) await context.supabase.storage.from("social-stories").remove(paths);
    return { ok: true };
  });

export const sendSocialMediaMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    conversationId: z.string().uuid(),
    kind: z.enum(["audio", "image"]),
    mediaPath: z.string().min(1).max(300),
    content: z.string().trim().max(4000).default(""),
  }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.mediaPath.startsWith(`${context.userId}/`) || data.mediaPath.includes("..")) throw new Error("Mídia inválida.");
    if (data.kind === "audio") {
      const access = await context.supabase.rpc("club_has_access", { _user_id: context.userId });
      if (access.error || !access.data) throw new Error("Envio de áudio exclusivo para assinantes do Clube HS.");
    }
    const label = data.kind === "audio" ? "🎤 Áudio" : "📷 Foto";
    const result = await context.supabase.from("social_messages").insert({
      conversation_id: data.conversationId,
      sender_id: context.userId,
      content: data.content || label,
      kind: data.kind,
      media_path: data.mediaPath,
    }).select().single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

// Mensagens com mídia precisam de URL temporária para tocar/exibir
export const getSocialMediaUrl = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ mediaPath: z.string().min(1).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: url, error } = await context.supabase.storage.from("social-stories").createSignedUrl(data.mediaPath, 3600);
    if (error || !url) throw new Error("Não foi possível abrir a mídia.");
    return url.signedUrl;
  });

// ===== Grupos (somente administrador cria e gerencia) =====
async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Somente o administrador pode gerenciar grupos.");
}

export const createSocialGroup = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().trim().min(2).max(80), memberIds: z.array(z.string().uuid()).max(200).default([]) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const group = await context.supabase.from("social_groups").insert({ name: data.name, created_by: context.userId }).select().single();
    if (group.error) throw new Error(group.error.message);
    const members = [...new Set([context.userId, ...data.memberIds])].map((user_id) => ({ group_id: group.data.id, user_id }));
    const inserted = await context.supabase.from("social_group_members").insert(members);
    if (inserted.error) throw new Error(inserted.error.message);
    return group.data;
  });

export const listSocialGroups = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const groups = await context.supabase.from("social_groups").select("*").order("created_at", { ascending: false });
    if (groups.error) throw new Error(groups.error.message);
    const members = await context.supabase.from("social_group_members").select("*");
    if (members.error) throw new Error(members.error.message);
    return { groups: groups.data ?? [], members: members.data ?? [] };
  });

export const setSocialGroupMembers = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ groupId: z.string().uuid(), memberIds: z.array(z.string().uuid()).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const wanted = [...new Set([context.userId, ...data.memberIds])];
    const removed = await context.supabase.from("social_group_members").delete().eq("group_id", data.groupId);
    if (removed.error) throw new Error(removed.error.message);
    const inserted = await context.supabase.from("social_group_members").insert(wanted.map((user_id) => ({ group_id: data.groupId, user_id })));
    if (inserted.error) throw new Error(inserted.error.message);
    return { ok: true };
  });

export const deleteSocialGroup = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ groupId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const deleted = await context.supabase.from("social_groups").delete().eq("id", data.groupId);
    if (deleted.error) throw new Error(deleted.error.message);
    return { ok: true };
  });

export const getSocialGroupMessages = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ groupId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.from("social_group_messages").select("*")
      .eq("group_id", data.groupId).order("created_at", { ascending: false }).limit(200);
    if (result.error) throw new Error(result.error.message);
    return (result.data ?? []).reverse();
  });

export const sendSocialGroupMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    groupId: z.string().uuid(),
    content: z.string().trim().max(4000).default(""),
    kind: z.enum(["text", "audio", "image"]).default("text"),
    mediaPath: z.string().max(300).nullable().default(null),
  }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.kind === "text" && !data.content) throw new Error("Mensagem vazia.");
    if (data.kind !== "text" && (!data.mediaPath?.startsWith(`${context.userId}/`) || data.mediaPath.includes(".."))) throw new Error("Mídia inválida.");
    if (data.kind === "audio") {
      const access = await context.supabase.rpc("club_has_access", { _user_id: context.userId });
      if (access.error || !access.data) throw new Error("Envio de áudio exclusivo para assinantes do Clube HS.");
    }
    const result = await context.supabase.from("social_group_messages").insert({
      group_id: data.groupId,
      sender_id: context.userId,
      content: data.content || (data.kind === "audio" ? "🎤 Áudio" : "📷 Foto"),
      kind: data.kind,
      media_path: data.mediaPath,
    }).select().single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });