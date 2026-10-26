import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Bell, Camera, Check, CheckCheck, ImagePlus, Loader2, MessageCircle, Mic,
  Pencil, Phone, Plus, Search, Video, Send, ShieldCheck, Square, Trash2, User, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  getSocialHome, getSocialMessages, openSocialConversation, openSocialConversationByUser,
  sendSocialMessage, publishSocialStory, deleteSocialStory, editSocialMessage,
  deleteSocialMessage, deleteSocialConversation, sendSocialMediaMessage, getSocialMediaUrl,
  createSocialGroup, listSocialGroups, setSocialGroupMembers, deleteSocialGroup,
  getSocialGroupMessages, sendSocialGroupMessage,
} from "@/lib/social.functions";
import { CallScreen, useSocialCalls } from "@/components/social-call";
import { isActiveStory, isSocialOnline, isSocialTyping } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/social")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
      { name: "robots", content: "noindex, follow" },
    { title: "HS Social · Mensagens e Stories" },
    { name: "description", content: "Converse com seus contatos da HS Digital e compartilhe stories de 24 horas." },
    { property: "og:title", content: "HS Social · Mensagens e Stories" },
    { property: "og:description", content: "Suas conversas e atualizações na HS Digital." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: HSSocialPage,
});

function Avatar({ name, url, size = "h-11 w-11" }: { name: string; url?: string | null; size?: string }) {
  const [full, setFull] = useState(false);
  if (url) return <>
    <img src={url} alt={name} role="button" tabIndex={0} title="Ver foto" className={`${size} shrink-0 cursor-zoom-in rounded-full object-cover`}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setFull(true); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setFull(true); } }} />
    {full && <div className="fixed inset-0 z-[90] flex flex-col bg-foreground/95" onClick={(e) => { e.stopPropagation(); setFull(false); }}>
      <div className="flex items-center justify-between p-4 text-background"><span className="font-semibold">{name}</span><button type="button" aria-label="Fechar foto" onClick={(e) => { e.stopPropagation(); setFull(false); }}><X className="h-6 w-6" /></button></div>
      <img src={url} alt={name} className="m-auto max-h-[85vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>}
  </>;
  return <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-success/10 font-semibold text-success`} aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || <User className="h-5 w-5" />}</span>;
}

// Bolha de mensagem: texto, áudio ou foto
function MessageBubble({ msg, mine, mediaUrl, onEdit, onDelete }: {
  msg: any; mine: boolean; mediaUrl?: string;
  onEdit: () => void; onDelete: () => void;
}) {
  const signFn = useServerFn(getSocialMediaUrl);
  const media = useQuery({
    queryKey: ["social-media", msg.media_path], enabled: Boolean(msg.media_path),
    queryFn: () => signFn({ data: { mediaPath: msg.media_path } }),
    staleTime: 50 * 60 * 1000, refetchInterval: 50 * 60 * 1000, retry: 2,
  });
  const url = media.data ?? mediaUrl;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 md:max-w-[70%] ${mine ? "bg-success/15" : "border bg-card"}`}>
        {msg.kind === "audio" && url && <audio controls src={url} className="w-52 max-w-full" />}
        {msg.kind === "image" && url && <img src={url} alt="Foto enviada" className="max-h-60 rounded-md object-contain" onError={() => void media.refetch()} />}
        {msg.media_path && !url && (media.isError ? <Button size="sm" variant="outline" onClick={() => void media.refetch()}>Tentar abrir mídia</Button> : <Loader2 aria-label="Carregando mídia" className="h-6 w-6 animate-spin" />)}
        {msg.kind !== "audio" && msg.kind !== "image" && (
          <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{msg.content}</p>
        )}
        {msg.kind === "image" && msg.content && msg.content !== "📷 Foto" && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{msg.content}</p>
        )}
        <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          {msg.edited_at && "editada · "}
          {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {mine && (msg.read_at ? <span className="flex items-center gap-1" title={`Visualizada em ${new Date(msg.read_at).toLocaleString("pt-BR")}`}><CheckCheck className="h-3 w-3 text-success" />Visualizada</span> : <span title="Mensagem enviada"><Check className="h-3 w-3" /></span>)}
        </span>
        {mine && (
          <span className="mt-1 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            {msg.kind === "text" && (
              <button onClick={onEdit} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                <Pencil className="h-3 w-3" /> Editar
              </button>
            )}
            <button onClick={onDelete} className="text-[10px] font-semibold text-muted-foreground hover:text-destructive flex items-center gap-0.5">
              <Trash2 className="h-3 w-3" /> Apagar
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function HSSocialPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const homeFn = useServerFn(getSocialHome);
  const messagesFn = useServerFn(getSocialMessages);
  const openFn = useServerFn(openSocialConversation);
  const sendFn = useServerFn(sendSocialMessage);
  const publishFn = useServerFn(publishSocialStory);
  const deleteFn = useServerFn(deleteSocialStory);
  const editMsgFn = useServerFn(editSocialMessage);
  const deleteMsgFn = useServerFn(deleteSocialMessage);
  const deleteRoomFn = useServerFn(deleteSocialConversation);
  const sendMediaFn = useServerFn(sendSocialMediaMessage);
  const createGroupFn = useServerFn(createSocialGroup);
  const listGroupsFn = useServerFn(listSocialGroups);
  const setMembersFn = useServerFn(setSocialGroupMembers);
  const deleteGroupFn = useServerFn(deleteSocialGroup);
  const groupMsgsFn = useServerFn(getSocialGroupMessages);
  const sendGroupMsgFn = useServerFn(sendSocialGroupMessage);

  const [tab, setTab] = useState<"chats" | "stories" | "groups">("chats");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [newContact, setNewContact] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [posting, setPosting] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [storyView, setStoryView] = useState<{ userId: string; index: number } | null>(null);
  const [storyReply, setStoryReply] = useState("");
  const [now, setNow] = useState(Date.now());
  const [editingMsg, setEditingMsg] = useState<any | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const typingLastSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatImageRef = useRef<HTMLInputElement | null>(null);
  const chatCameraRef = useRef<HTMLInputElement | null>(null);
  const storyCameraRef = useRef<HTMLInputElement | null>(null);
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSelected, setGroupSelected] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [profileDialog, setProfileDialog] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const profilePhotoRef = useRef<HTMLInputElement | null>(null);
  const end = useRef<HTMLDivElement | null>(null);

  const admin = useQuery({ queryKey: ["social-admin", user.id], queryFn: async () => {
    const result = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (result.error) throw result.error;
    return result.data;
  } });
  const isAdmin = Boolean(admin.data);
  const presence = useQuery({ queryKey: ["social-presence", user.id], queryFn: async () => {
    const result = await supabase.from("social_presence").select("*");
    if (result.error) throw result.error;
    return result.data;
  }, refetchInterval: 15000 });
  const alerts = useQuery({ queryKey: ["notification-count"], queryFn: async () => {
    const result = await supabase.from("account_notifications").select("id", { head: true, count: "exact" }).is("read_at", null);
    if (result.error) throw result.error;
    return result.count ?? 0;
  }, refetchInterval: 30000 });

  const home = useQuery({ queryKey: ["social-home", user.id], queryFn: () => homeFn(), refetchInterval: 60000 });
  const messages = useQuery({ queryKey: ["social-messages", user.id, roomId], enabled: Boolean(roomId),
    queryFn: () => roomId ? messagesFn({ data: { conversationId: roomId } }) : Promise.resolve([]), refetchInterval: 15000 });
  const groups = useQuery({ queryKey: ["social-groups", user.id], queryFn: () => listGroupsFn(), refetchInterval: 60000 });
  const groupMessages = useQuery({ queryKey: ["social-group-messages", groupId], enabled: Boolean(groupId),
    queryFn: () => groupId ? groupMsgsFn({ data: { groupId } }) : Promise.resolve([]), refetchInterval: 15000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["social-home", user.id] });

  useEffect(() => {
    const visible = () => setPageVisible(document.visibilityState === "visible");
    visible(); document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    const channel = supabase.channel(`hs-social-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_messages" }, () => {
        void qc.invalidateQueries({ queryKey: ["social-messages", user.id] });
        void qc.invalidateQueries({ queryKey: ["social-home", user.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "social_group_messages" }, () => {
        void qc.invalidateQueries({ queryKey: ["social-group-messages"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_conversations" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "social_stories" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "social_presence" }, () => { void qc.invalidateQueries({ queryKey: ["social-presence", user.id] }); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc, user.id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.data?.length, groupMessages.data?.length, roomId, groupId]);

  useEffect(() => {
    if (!roomId || !pageVisible || !messages.data?.some((msg) => msg.sender_id !== user.id && !msg.read_at)) return;
    let active = true;
    void supabase.rpc("social_mark_read", { _conversation_id: roomId }).then(({ error }) => {
      if (!error && active) {
        void qc.invalidateQueries({ queryKey: ["social-messages", user.id, roomId] });
        void refresh();
      }
    });
    return () => { active = false; };
  }, [roomId, pageVisible, messages.data, user.id, qc]);
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (roomId) void supabase.rpc("social_set_typing", { _conversation_id: roomId, _typing: false }).then(() => {});
    };
  }, [roomId]);
  function changeMessage(value: string) {
    setMessage(value);
    if (!roomId || editingMsg) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (!value.trim()) { void supabase.rpc("social_set_typing", { _conversation_id: roomId, _typing: false }).then(() => {}); return; }
    if (Date.now() - typingLastSent.current > 2000) {
      typingLastSent.current = Date.now();
      void supabase.rpc("social_set_typing", { _conversation_id: roomId, _typing: true }).then(() => {});
    }
    typingTimer.current = setTimeout(() => { void supabase.rpc("social_set_typing", { _conversation_id: roomId, _typing: false }).then(() => {}); }, 3000);
  }

  const data = home.data;
  const rooms = data?.rooms ?? [];
  const personFor = (id: string) => data?.people.find((person) => person.id === id);
  const nameFor = (id: string) => personFor(id)?.full_name || "Contato HS Digital";
  const avatarFor = (id: string) => personFor(id)?.avatar_url;
  const calls = useSocialCalls(user.id, data?.me?.full_name || "Contato HS Digital");
  const room = rooms.find((entry) => entry.id === roomId);
  const otherId = room ? (room.member_a === user.id ? room.member_b : room.member_a) : "";
  const activeGroup = (groups.data?.groups ?? []).find((g: any) => g.id === groupId);
  const activeStories = (data?.stories ?? []).filter((entry) => isActiveStory(entry.expires_at, now));
  const storyGroups = activeStories.reduce<Array<{ userId: string; stories: typeof activeStories }>>((groupsList, entry) => {
    const group = groupsList.find((g) => g.userId === entry.user_id);
    if (group) group.stories.push(entry);
    else groupsList.push({ userId: entry.user_id, stories: [entry] });
    return groupsList;
  }, []);
  const viewGroup = storyView ? storyGroups.find((g) => g.userId === storyView.userId) : null;
  const story = viewGroup && storyView ? viewGroup.stories[Math.min(storyView.index, viewGroup.stories.length - 1)] : null;
  useEffect(() => {
    if (!storyView || !viewGroup) return;
    const timer = setTimeout(() => {
      if (storyView.index + 1 < viewGroup.stories.length) setStoryView({ userId: storyView.userId, index: storyView.index + 1 });
      else setStoryView(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [storyView, viewGroup]);

  async function replyToStory(e: React.FormEvent) {
    e.preventDefault();
    if (!story || !storyReply.trim()) return;
    setBusy(true);
    try {
      const found = await openSocialConversationByUser({ data: { userId: story.user_id } });
      await sendFn({ data: { conversationId: found.conversation_id, content: `💬 Resposta ao seu story: ${storyReply.trim()}` } });
      setStoryReply("");
      await refresh();
      toast.success("Resposta enviada para a conversa!");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível responder."); }
    finally { setBusy(false); }
  }

  function storyRing(count: number): React.CSSProperties {
    if (count <= 1) return { background: "conic-gradient(var(--success) 0deg 360deg)" };
    const gap = 6;
    const size = 360 / count;
    const parts = Array.from({ length: count }, (_, i) => {
      const start = i * size;
      return `var(--success) ${start}deg ${start + size - gap}deg, transparent ${start + size - gap}deg ${start + size}deg`;
    });
    return { background: `conic-gradient(${parts.join(", ")})` };
  }

  async function findContact(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const found = await openFn({ data: { phone } });
      await refresh(); setRoomId(found.conversation_id); setGroupId(null); setTab("chats"); setNewContact(false); setPhone("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível encontrar esse perfil."); }
    finally { setBusy(false); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (editingMsg) {
      if (!message.trim()) return;
      setBusy(true);
      try {
        await editMsgFn({ data: { messageId: editingMsg.id, content: message.trim() } });
        setEditingMsg(null); setMessage("");
        await qc.invalidateQueries({ queryKey: ["social-messages", user.id, roomId] });
      } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível editar."); }
      finally { setBusy(false); }
      return;
    }
    if (groupId) {
      if (!message.trim()) return;
      setBusy(true);
      try {
        await sendGroupMsgFn({ data: { groupId, content: message.trim(), kind: "text", mediaPath: null } });
        setMessage(""); await qc.invalidateQueries({ queryKey: ["social-group-messages", groupId] });
      } catch (error) { toast.error(error instanceof Error ? error.message : "Mensagem não enviada."); }
      finally { setBusy(false); }
      return;
    }
    if (!roomId || !message.trim()) return;
    setBusy(true);
    try {
      await sendFn({ data: { conversationId: roomId, content: message } });
      void supabase.rpc("social_set_typing", { _conversation_id: roomId, _typing: false }).then(() => {});
      setMessage(""); await qc.invalidateQueries({ queryKey: ["social-messages", user.id, roomId] }); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Mensagem não enviada."); }
    finally { setBusy(false); }
  }

  async function uploadChatMedia(mediaFile: File, kind: "audio" | "image") {
    if (!roomId && !groupId) throw new Error("Selecione uma conversa.");
    const ext = kind === "audio" ? (mediaFile.type.includes("mp4") ? "m4a" : mediaFile.type.includes("ogg") ? "ogg" : "webm") : (mediaFile.type === "image/png" ? "png" : "jpg");
    const path = `${user.id}/chat-${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage.from("social-stories").upload(path, mediaFile, { contentType: mediaFile.type });
    if (upload.error) throw new Error("Não foi possível enviar a mídia.");
    try { if (groupId) {
      await sendGroupMsgFn({ data: { groupId, content: "", kind, mediaPath: path } });
      await qc.invalidateQueries({ queryKey: ["social-group-messages", groupId] });
    } else if (roomId) {
      await sendMediaFn({ data: { conversationId: roomId, kind, mediaPath: path, content: "" } });
      await qc.invalidateQueries({ queryKey: ["social-messages", user.id, roomId] });
    }
    await refresh();
    } catch (error) {
      await supabase.storage.from("social-stories").remove([path]);
      throw error;
    }
  }

  async function sendChatImage(picked: File | null) {
    if (!picked) return;
    if (picked.size > 10 * 1024 * 1024 || !picked.type.startsWith("image/")) { toast.error("Selecione uma foto de até 10 MB."); return; }
    setBusy(true);
    try { await uploadChatMedia(picked, "image"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto."); }
    finally { setBusy(false); }
  }

  const [recSeconds, setRecSeconds] = useState(0);
  const cancelRecRef = useRef(false);
  const recTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  function stopRecording(cancel: boolean) {
    cancelRecRef.current = cancel;
    recorderRef.current?.stop();
  }
  async function toggleRecording() {
    if (recording) { stopRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const type = (recorder.mimeType || mime || "audio/webm").split(";")[0];
      chunksRef.current = [];
      cancelRecRef.current = false;
      recorder.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recTimer.current);
        setRecording(false);
        setRecSeconds(0);
        if (cancelRecRef.current) return;
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < 1000) { toast.info("Áudio muito curto."); return; }
        setBusy(true);
        try {
          const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
          await uploadChatMedia(new File([blob], `audio.${ext}`, { type }), "audio");
          toast.success("Áudio enviado");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar o áudio."); }
        finally { setBusy(false); }
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setRecSeconds(0);
      recTimer.current = setInterval(() => setRecSeconds((v) => {
        if (v + 1 >= 180) stopRecording(false);
        return v + 1;
      }), 1000);
    } catch {
      toast.error("Permita o acesso ao microfone para gravar áudio.");
    }
  }

  async function removeConversation() {
    if (!roomId || !window.confirm("Apagar esta conversa e todas as mensagens?")) return;
    setBusy(true);
    try {
      await deleteRoomFn({ data: { conversationId: roomId } });
      setRoomId(null); await refresh();
      toast.success("Conversa apagada.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível apagar."); }
    finally { setBusy(false); }
  }

  async function post(e: React.FormEvent) {
    e.preventDefault(); if (!caption.trim() && !file) return;
    setBusy(true); let path: string | null = null;
    try {
      if (file) {
        if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Selecione uma foto JPG, PNG ou WebP de até 5 MB.");
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from("social-stories").upload(path, file, { contentType: file.type });
        if (upload.error) throw new Error("Não foi possível enviar a foto.");
      }
      await publishFn({ data: { caption, mediaPath: path } });
      setPosting(false); setCaption(""); setFile(null); await refresh(); toast.success("Story publicado por 24 horas.");
    } catch (error) {
      if (path) await supabase.storage.from("social-stories").remove([path]);
      toast.error(error instanceof Error ? error.message : "Story não publicado.");
    } finally { setBusy(false); }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let avatarUrl: string | undefined;
      if (profilePhoto) {
        if (!profilePhoto.type.startsWith("image/") || profilePhoto.size > 5 * 1024 * 1024) throw new Error("Foto de perfil: imagem de até 5 MB.");
        const path = `${user.id}/profile-${Date.now()}.jpg`;
        const upload = await supabase.storage.from("social-stories").upload(path, profilePhoto, { contentType: profilePhoto.type });
        if (upload.error) throw new Error("Não foi possível enviar a foto.");
        avatarUrl = path;
      }
      const update: any = { full_name: profileName.trim() || null };
      if (avatarUrl) update.avatar_url = avatarUrl;
      const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
      if (error) throw new Error("Não foi possível salvar o perfil.");
      setProfileDialog(false); setProfilePhoto(null); await refresh();
      toast.success("Perfil atualizado!");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }

  async function saveGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim() && !editingGroup) return;
    setBusy(true);
    try {
      if (editingGroup) {
        await setMembersFn({ data: { groupId: editingGroup.id, memberIds: groupSelected } });
        toast.success("Grupo atualizado!");
      } else {
        await createGroupFn({ data: { name: groupName.trim(), memberIds: groupSelected } });
        toast.success("Grupo criado!");
      }
      setGroupDialog(false); setEditingGroup(null); setGroupName(""); setGroupSelected([]);
      await qc.invalidateQueries({ queryKey: ["social-groups", user.id] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o grupo."); }
    finally { setBusy(false); }
  }

  const groupMembersOf = (gid: string) => (groups.data?.members ?? []).filter((m: any) => m.group_id === gid);

  return <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <CallScreen calls={calls} />
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" title="Voltar à vitrine"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <MessageCircle className="h-7 w-7 text-success" /><h1 className="text-lg font-bold">HS Social</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" title="Notificações" aria-label="Notificações"><Link to="/notificacoes" className="relative"><Bell className="h-5 w-5" />{Boolean(alerts.data) && <span className="absolute right-0 top-0 rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{alerts.data}</span>}</Link></Button>
        <Button variant="ghost" size="icon" onClick={() => { setProfileName(data?.me?.full_name ?? ""); setProfileDialog(true); }} title="Meu perfil" aria-label="Editar meu perfil"><User className="h-5 w-5" /></Button>
        <Button size="icon" onClick={() => setNewContact(true)} title="Nova conversa" aria-label="Nova conversa"><Plus className="h-5 w-5" /></Button>
      </div>
    </header>
    <div className="flex min-h-0 flex-1">
      <aside className={`w-full shrink-0 flex-col border-r bg-card md:w-80 ${roomId || groupId ? "hidden md:flex" : "flex"}`}>
        <div className="grid grid-cols-3 gap-1 border-b p-2">
          <Button variant={tab === "chats" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("chats")}><MessageCircle className="mr-1 h-4 w-4" />Conversas</Button>
          <Button variant={tab === "stories" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("stories")}><ImagePlus className="mr-1 h-4 w-4" />Stories</Button>
          <Button variant={tab === "groups" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("groups")}><Users className="mr-1 h-4 w-4" />Grupos</Button>
        </div>
        <button onClick={() => { setProfileName(data?.me?.full_name ?? ""); setProfileDialog(true); }} className="flex items-center gap-2 border-b p-3 text-left hover:bg-accent/50">
          <Avatar name={data?.me?.full_name ?? ""} url={data?.me?.avatar_url} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{data?.me?.full_name || "Minha conta"}</p><p className="text-xs text-muted-foreground">{data?.me?.phone || "Telefone não cadastrado"}</p></div>
          <Pencil className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {home.isPending && <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />}
        {home.error && <div className="p-4"><p role="alert" className="text-sm text-destructive">Não foi possível carregar suas conversas.</p><Button variant="outline" onClick={() => home.refetch()}>Tentar novamente</Button></div>}
        {tab === "chats" && <>
          <div className="relative m-3"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Pesquisar conversa" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="flex-1 overflow-y-auto">
            {!home.isPending && !rooms.length && <div className="p-8 text-center"><MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhuma conversa</p><Button variant="outline" className="mt-4" onClick={() => setNewContact(true)}>Nova conversa</Button></div>}
            {rooms.filter((entry) => nameFor(entry.member_a === user.id ? entry.member_b : entry.member_a).toLowerCase().includes(search.toLowerCase())).map((entry) => {
              const oid = entry.member_a === user.id ? entry.member_b : entry.member_a;
              const name = nameFor(oid);
              const latest = data?.recentMessages.find((msg) => msg.conversation_id === entry.id);
              const unread = data?.recentMessages.filter((msg) => msg.conversation_id === entry.id && msg.sender_id !== user.id && !msg.read_at).length ?? 0;
              return <Button key={entry.id} variant="ghost" onClick={() => { setRoomId(entry.id); setGroupId(null); setMessage(""); setEditingMsg(null); }} className={`h-auto w-full justify-start gap-3 rounded-none border-b p-4 ${entry.id === roomId ? "bg-accent" : ""}`}>
                <span className="relative shrink-0"><Avatar name={name} url={avatarFor(oid)} /><span title={isSocialOnline(presence.data?.find((p) => p.user_id === oid)?.last_seen_at, now) ? "Online" : "Offline"} className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${isSocialOnline(presence.data?.find((p) => p.user_id === oid)?.last_seen_at, now) ? "bg-success" : "bg-destructive"}`} /></span><span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-xs font-normal text-muted-foreground">{isSocialTyping(presence.data?.find((p) => p.user_id === oid), entry.id, now) ? "Digitando…" : latest?.content || "Sem mensagens"}</span></span>{unread > 0 && <span className="rounded-full bg-success px-2 text-xs text-success-foreground">{unread}</span>}
              </Button>;
            })}
          </div>
        </>}
        {tab === "stories" && <div className="flex-1 overflow-y-auto p-3">
          <Button className="mb-4 w-full" onClick={() => setPosting(true)}><Plus className="mr-2 h-4 w-4" />Publicar story</Button>
          {!activeStories.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum story ativo</p>}
          {storyGroups.map((group) => <Button variant="ghost" key={group.userId} onClick={() => setStoryView({ userId: group.userId, index: 0 })} className="mb-2 h-auto w-full justify-start gap-3 p-2"><span className="rounded-full p-[3px]" style={storyRing(group.stories.length)}><span className="block rounded-full bg-card p-[2px]"><Avatar name={nameFor(group.userId)} url={avatarFor(group.userId)} /></span></span><span className="min-w-0 text-left"><span className="block truncate text-sm">{group.userId === user.id ? "Meu story" : nameFor(group.userId)}</span><span className="text-xs font-normal text-muted-foreground">{group.stories.length > 1 ? `${group.stories.length} stories · ` : ""}{new Date(group.stories[0].created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></span></Button>)}
        </div>}
        {tab === "groups" && <div className="flex-1 overflow-y-auto p-3">
          {isAdmin && <Button className="mb-4 w-full" onClick={() => { setEditingGroup(null); setGroupName(""); setGroupSelected([]); setGroupDialog(true); }}><Plus className="mr-2 h-4 w-4" />Criar grupo</Button>}
          {!(groups.data?.groups ?? []).length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum grupo ainda</p>}
          {(groups.data?.groups ?? []).map((g: any) => (
            <div key={g.id} className={`mb-1 flex items-center gap-1 rounded-lg ${g.id === groupId ? "bg-accent" : ""}`}>
              <Button variant="ghost" onClick={() => { setGroupId(g.id); setRoomId(null); setMessage(""); }} className="h-auto flex-1 justify-start gap-3 p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Users className="h-5 w-5" /></span>
                <span className="min-w-0 text-left"><span className="block truncate text-sm font-semibold">{g.name}</span><span className="text-xs font-normal text-muted-foreground">{groupMembersOf(g.id).length} participantes</span></span>
              </Button>
              {isAdmin && <>
                <Button variant="ghost" size="icon" title="Editar membros" onClick={() => { setEditingGroup(g); setGroupName(g.name); setGroupSelected(groupMembersOf(g.id).map((m: any) => m.user_id).filter((id: string) => id !== user.id)); setGroupDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Apagar grupo" onClick={async () => { if (window.confirm(`Apagar o grupo "${g.name}"?`)) { await deleteGroupFn({ data: { groupId: g.id } }); if (groupId === g.id) setGroupId(null); await qc.invalidateQueries({ queryKey: ["social-groups", user.id] }); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </>}
            </div>
          ))}
        </div>}
      </aside>
      <main className={`min-w-0 flex-1 flex-col bg-muted/30 ${roomId || groupId ? "flex" : "hidden md:flex"}`}>
        {room ? <>
          <div className="flex h-18 shrink-0 items-center gap-3 border-b bg-card p-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setRoomId(null)} aria-label="Voltar às conversas"><ArrowLeft className="h-5 w-5" /></Button>
            <Avatar name={nameFor(otherId)} url={avatarFor(otherId)} />
            <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{nameFor(otherId)}</h2><p className={`flex items-center gap-1 text-xs ${isSocialOnline(presence.data?.find((p) => p.user_id === otherId)?.last_seen_at, now) ? "text-success" : "text-destructive"}`}><span className="h-2 w-2 rounded-full bg-current" />{isSocialTyping(presence.data?.find((p) => p.user_id === otherId), room.id, now) ? "Digitando…" : isSocialOnline(presence.data?.find((p) => p.user_id === otherId)?.last_seen_at, now) ? "Online" : "Offline"}</p></div>
            <Button variant="ghost" size="icon" title="Chamada de voz" aria-label="Chamada de voz" onClick={() => void calls.startCall(otherId, nameFor(otherId), false)}><Phone className="h-5 w-5 text-success" /></Button>
            <Button variant="ghost" size="icon" title="Chamada de vídeo" aria-label="Chamada de vídeo" onClick={() => void calls.startCall(otherId, nameFor(otherId), true)}><Video className="h-5 w-5 text-success" /></Button>
            <Button variant="ghost" size="icon" title="Apagar conversa" aria-label="Apagar conversa" onClick={removeConversation}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.isPending && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
            {messages.error && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as mensagens.</p>}
            {messages.data?.map((msg: any) => (
              <MessageBubble key={msg.id} msg={msg} mine={msg.sender_id === user.id}
                onEdit={() => { setEditingMsg(msg); setMessage(msg.content); }}
                onDelete={async () => { try { await deleteMsgFn({ data: { messageId: msg.id } }); await qc.invalidateQueries({ queryKey: ["social-messages", user.id, roomId] }); } catch { toast.error("Não foi possível apagar."); } }} />
            ))}
            <div ref={end} />
          </div>
          {editingMsg && <div className="flex items-center justify-between border-t bg-accent/60 px-3 py-1.5 text-xs"><span className="truncate">Editando mensagem</span><button onClick={() => { setEditingMsg(null); setMessage(""); }} aria-label="Cancelar edição"><X className="h-3.5 w-3.5" /></button></div>}
          {recording && <div className="flex shrink-0 items-center gap-3 border-t bg-card px-3 py-2"><span className="h-3 w-3 animate-pulse rounded-full bg-destructive" /><span className="text-sm font-semibold tabular-nums">{String(Math.floor(recSeconds / 60)).padStart(2, "0")}:{String(recSeconds % 60).padStart(2, "0")}</span><span className="flex flex-1 items-center gap-0.5" aria-hidden="true">{Array.from({ length: 24 }).map((_, i) => <span key={i} className="w-1 rounded-full bg-success/70" style={{ height: `${6 + ((i * 7 + recSeconds * 5) % 16)}px` }} />)}</span><Button type="button" variant="ghost" size="sm" onClick={() => stopRecording(true)} className="text-destructive"><Trash2 className="mr-1 h-4 w-4" />Cancelar</Button><Button type="button" size="sm" onClick={() => stopRecording(false)} className="bg-success text-success-foreground hover:bg-success/90"><Send className="mr-1 h-4 w-4" />Enviar</Button></div>}
          <form onSubmit={send} className={`flex shrink-0 items-end gap-2 border-t bg-card p-3 ${recording ? "hidden" : ""}`}>
            <input ref={chatImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void sendChatImage(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <input ref={chatCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void sendChatImage(e.target.files?.[0] ?? null); e.target.value = ""; }} /><Button type="button" variant="ghost" size="icon" title="Abrir câmera" aria-label="Abrir câmera" onClick={() => chatCameraRef.current?.click()}><Camera className="h-5 w-5" /></Button><Button type="button" variant="ghost" size="icon" title="Enviar foto da galeria" aria-label="Enviar foto da galeria" onClick={() => chatImageRef.current?.click()}><ImagePlus className="h-5 w-5" /></Button>
            <Textarea aria-label="Mensagem" placeholder="Digite sua mensagem…" value={message} maxLength={4000} onChange={(e) => changeMessage(e.target.value)} rows={1} className="max-h-32 min-h-10 resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e); } }} />
            <Button type="button" variant={recording ? "destructive" : "ghost"} size="icon" title={recording ? "Parar e enviar áudio" : "Gravar áudio"} aria-label={recording ? "Parar gravação" : "Gravar áudio"} onClick={() => void toggleRecording()}>{recording ? <Square className="h-4 w-4 animate-pulse" /> : <Mic className="h-5 w-5" />}</Button>
            <Button type="submit" size="icon" title="Enviar mensagem" aria-label="Enviar mensagem" disabled={busy || !message.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
          </form>
        </> : activeGroup ? <>
          <div className="flex h-18 shrink-0 items-center gap-3 border-b bg-card p-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setGroupId(null)} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Button>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Users className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{activeGroup.name}</h2><p className="truncate text-xs text-muted-foreground">{groupMembersOf(activeGroup.id).map((m: any) => m.user_id === user.id ? "Você" : nameFor(m.user_id)).join(", ")}</p></div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {groupMessages.isPending && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
            {groupMessages.data?.map((msg: any) => (
              <div key={msg.id}>
                {msg.sender_id !== user.id && <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">{msg.sender_id === activeGroup.created_by ? "Admin" : nameFor(msg.sender_id)}</p>}
                <MessageBubble msg={msg} mine={msg.sender_id === user.id}
                  onEdit={() => {}}
                  onDelete={async () => { await supabase.from("social_group_messages").delete().eq("id", msg.id); await qc.invalidateQueries({ queryKey: ["social-group-messages", groupId] }); }} />
              </div>
            ))}
            <div ref={end} />
          </div>
          {recording && <div className="flex shrink-0 items-center gap-3 border-t bg-card px-3 py-2"><span className="h-3 w-3 animate-pulse rounded-full bg-destructive" /><span className="text-sm font-semibold tabular-nums">{String(Math.floor(recSeconds / 60)).padStart(2, "0")}:{String(recSeconds % 60).padStart(2, "0")}</span><span className="flex flex-1 items-center gap-0.5" aria-hidden="true">{Array.from({ length: 24 }).map((_, i) => <span key={i} className="w-1 rounded-full bg-success/70" style={{ height: `${6 + ((i * 7 + recSeconds * 5) % 16)}px` }} />)}</span><Button type="button" variant="ghost" size="sm" onClick={() => stopRecording(true)} className="text-destructive"><Trash2 className="mr-1 h-4 w-4" />Cancelar</Button><Button type="button" size="sm" onClick={() => stopRecording(false)} className="bg-success text-success-foreground hover:bg-success/90"><Send className="mr-1 h-4 w-4" />Enviar</Button></div>}
          <form onSubmit={send} className={`flex shrink-0 items-end gap-2 border-t bg-card p-3 ${recording ? "hidden" : ""}`}>
            <input ref={chatImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void sendChatImage(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <input ref={chatCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void sendChatImage(e.target.files?.[0] ?? null); e.target.value = ""; }} /><Button type="button" variant="ghost" size="icon" title="Abrir câmera" aria-label="Abrir câmera" onClick={() => chatCameraRef.current?.click()}><Camera className="h-5 w-5" /></Button><Button type="button" variant="ghost" size="icon" title="Enviar foto da galeria" aria-label="Enviar foto da galeria" onClick={() => chatImageRef.current?.click()}><ImagePlus className="h-5 w-5" /></Button>
            <Textarea aria-label="Mensagem do grupo" placeholder="Mensagem para o grupo…" value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} rows={1} className="max-h-32 min-h-10 resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e); } }} />
            <Button type="button" variant={recording ? "destructive" : "ghost"} size="icon" title={recording ? "Parar e enviar áudio" : "Gravar áudio"} aria-label={recording ? "Parar gravação" : "Gravar áudio"} onClick={() => void toggleRecording()}>{recording ? <Square className="h-4 w-4 animate-pulse" /> : <Mic className="h-5 w-5" />}</Button>
            <Button type="submit" size="icon" title="Enviar" aria-label="Enviar" disabled={busy || !message.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
          </form>
        </> : <div className="grid flex-1 place-items-center"><div className="text-center"><MessageCircle className="mx-auto mb-4 h-16 w-16 text-success" /><h2 className="text-xl font-semibold">HS Social</h2><ShieldCheck className="mx-auto mt-3 h-5 w-5 text-muted-foreground" /></div></div>}
      </main>
    </div>

    <Dialog open={newContact} onOpenChange={setNewContact}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader><form onSubmit={findContact} className="space-y-4"><label htmlFor="contact-phone" className="text-sm">Número com DDD</label><Input id="contact-phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} required /><Button type="submit" className="w-full" disabled={busy}>{busy ? "Buscando…" : "Encontrar perfil"}</Button></form></DialogContent></Dialog>

    <Dialog open={posting} onOpenChange={setPosting}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Publicar story</DialogTitle></DialogHeader><form onSubmit={post} className="space-y-4">
      {preview && <img src={preview} alt="Prévia do story" className="max-h-64 w-full rounded-lg object-contain" />}
      <input ref={storyCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => storyCameraRef.current?.click()}><Camera className="mr-2 h-4 w-4" />Câmera</Button>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border text-sm hover:bg-accent"><ImagePlus className="h-4 w-4 text-success" />Galeria<input aria-label="Foto do story" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" /></label>
      </div>
      <Textarea aria-label="Texto do story" placeholder="Escreva seu story…" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} />
      <Button className="w-full" type="submit" disabled={busy || (!caption.trim() && !file)}>{busy ? "Publicando…" : "Publicar por 24 horas"}</Button>
    </form></DialogContent></Dialog>

    <Dialog open={Boolean(story)} onOpenChange={(open) => { if (!open) { setStoryView(null); setStoryReply(""); } }}><DialogContent className="max-w-md overflow-hidden bg-ink text-ink-foreground"><DialogHeader><DialogTitle>{story ? nameFor(story.user_id) : "Story"}</DialogTitle></DialogHeader>{story && viewGroup && storyView && <div className="space-y-4">
      <div className="flex gap-1">{viewGroup.stories.map((s, i) => <span key={s.id} className={`h-1 flex-1 rounded-full ${i <= storyView.index ? "bg-success" : "bg-muted-foreground/30"}`} />)}</div>
      <div className="flex min-h-64 items-center justify-center">{story.mediaUrl ? <img src={story.mediaUrl} alt="Story" className="max-h-[60dvh] w-full object-contain" /> : <MessageCircle className="h-16 w-16 text-success" />}</div>
      <p className="whitespace-pre-wrap break-words text-center text-lg [overflow-wrap:anywhere]">{story.caption}</p>
      {viewGroup.stories.length > 1 && <div className="flex justify-between"><Button variant="ghost" size="sm" disabled={storyView.index === 0} onClick={() => setStoryView({ userId: storyView.userId, index: storyView.index - 1 })}>Anterior</Button><Button variant="ghost" size="sm" onClick={() => storyView.index + 1 < viewGroup.stories.length ? setStoryView({ userId: storyView.userId, index: storyView.index + 1 }) : setStoryView(null)}>Próximo</Button></div>}
      {story.user_id !== user.id && <form onSubmit={replyToStory} className="flex items-center gap-2"><Input aria-label="Responder story" placeholder="Responder esse story…" value={storyReply} maxLength={1000} onChange={(e) => setStoryReply(e.target.value)} className="bg-background/10" /><Button type="submit" size="icon" aria-label="Enviar resposta" disabled={busy || !storyReply.trim()}><Send className="h-4 w-4" /></Button></form>}
      {story.user_id === user.id && <Button variant="destructive" className="w-full" onClick={async () => { try { await deleteFn({ data: { storyId: story.id } }); setStoryView(null); await refresh(); } catch { toast.error("Não foi possível remover o story."); } }}><Trash2 className="mr-2 h-4 w-4" />Excluir story</Button>}
    </div>}</DialogContent></Dialog>

    <Dialog open={profileDialog} onOpenChange={setProfileDialog}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Meu perfil no HS Social</DialogTitle></DialogHeader><form onSubmit={saveProfile} className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar name={profileName || "?"} url={profilePhoto ? URL.createObjectURL(profilePhoto) : data?.me?.avatar_url} size="h-16 w-16" />
        <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setProfilePhoto(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" onClick={() => profilePhotoRef.current?.click()}><Camera className="mr-2 h-4 w-4" />Trocar foto</Button>
      </div>
      <div><label htmlFor="profile-name" className="text-sm">Nome de exibição</label><Input id="profile-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} maxLength={80} /></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar perfil"}</Button>
    </form></DialogContent></Dialog>

    <Dialog open={groupDialog} onOpenChange={setGroupDialog}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{editingGroup ? "Editar grupo" : "Criar grupo"}</DialogTitle></DialogHeader><form onSubmit={saveGroup} className="space-y-4">
      {!editingGroup && <div><label htmlFor="group-name" className="text-sm">Nome do grupo</label><Input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} maxLength={80} required /></div>}
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Adicionar contatos</p>
        {(data?.people ?? []).map((p: any) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-accent">
            <input type="checkbox" checked={groupSelected.includes(p.id)} onChange={(e) => setGroupSelected((prev) => e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id))} />
            <Avatar name={p.full_name || "?"} url={p.avatar_url} size="h-8 w-8" />
            <span className="truncate text-sm">{p.full_name || "Contato HS"}</span>
          </label>
        ))}
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando…" : editingGroup ? "Salvar membros" : "Criar grupo"}</Button>
    </form></DialogContent></Dialog>
  </div>;
}
