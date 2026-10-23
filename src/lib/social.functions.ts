import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSocialHome = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [rooms, people, me, stories, messages] = await Promise.all([
      db.from("social_conversations").select("*").order("created_at", { ascending: false }),
      db.rpc("social_contact_profiles"),
      db.from("profiles").select("id,full_name,phone").eq("id", context.userId).single(),
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
    return { me: me.data, people: people.data ?? [], rooms: rooms.data ?? [], stories: storyRows, recentMessages: messages.data ?? [] };
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

export const getSocialMessages = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.from("social_messages").select("*")
      .eq("conversation_id", data.conversationId).order("created_at", { ascending: false }).limit(200);
    if (result.error) throw new Error(result.error.message);
    const read = await context.supabase.rpc("social_mark_read", { _conversation_id: data.conversationId });
    if (read.error) throw new Error(read.error.message);
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