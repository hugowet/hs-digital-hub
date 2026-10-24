import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, ImagePlus, Loader2, MessageCircle, Plus, Search, Send, ShieldCheck, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getSocialHome, getSocialMessages, openSocialConversation, openSocialConversationByUser, sendSocialMessage, publishSocialStory, deleteSocialStory } from "@/lib/social.functions";
import { isActiveStory } from "@/lib/social";

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

function Initials({ name }: { name: string }) {
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success/10 font-semibold text-success" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || <User className="h-5 w-5" />}</span>;
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
  const [tab, setTab] = useState<"chats" | "stories">("chats");
  const [roomId, setRoomId] = useState<string | null>(null);
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
  const end = useRef<HTMLDivElement | null>(null);
  const home = useQuery({ queryKey: ["social-home", user.id], queryFn: () => homeFn(), refetchInterval: 60000 });
  const messages = useQuery({ queryKey: ["social-messages", user.id, roomId], enabled: Boolean(roomId),
    queryFn: () => roomId ? messagesFn({ data: { conversationId: roomId } }) : Promise.resolve([]), refetchInterval: 15000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["social-home", user.id] });

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_conversations" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "social_stories" }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc, user.id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.data?.length, roomId]);

  const data = home.data;
  const rooms = data?.rooms ?? [];
  const nameFor = (id: string) => data?.people.find((person) => person.id === id)?.full_name || "Contato HS Digital";
  const room = rooms.find((entry) => entry.id === roomId);
  const otherId = room ? (room.member_a === user.id ? room.member_b : room.member_a) : "";
  const activeStories = (data?.stories ?? []).filter((entry) => isActiveStory(entry.expires_at, now));
  // Uma bolinha por pessoa; o círculo é fatiado conforme a quantidade de stories
  const storyGroups = activeStories.reduce<Array<{ userId: string; stories: typeof activeStories }>>((groups, entry) => {
    const group = groups.find((g) => g.userId === entry.user_id);
    if (group) group.stories.push(entry);
    else groups.push({ userId: entry.user_id, stories: [entry] });
    return groups;
  }, []);
  const viewGroup = storyView ? storyGroups.find((g) => g.userId === storyView.userId) : null;
  const story = viewGroup ? viewGroup.stories[Math.min(storyView!.index, viewGroup.stories.length - 1)] : null;
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
      const room = await openSocialConversationByUser({ data: { userId: story.user_id } });
      await sendFn({ data: { conversationId: room.conversation_id, content: `💬 Resposta ao seu story: ${storyReply.trim()}` } });
      setStoryReply("");
      await refresh();
      toast.success("Resposta enviada para a conversa!");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível responder."); }
    finally { setBusy(false); }
  }

  // Anel fatiado estilo WhatsApp: um segmento por story
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
      await refresh(); setRoomId(found.conversation_id); setTab("chats"); setNewContact(false); setPhone("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível encontrar esse perfil."); }
    finally { setBusy(false); }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!roomId || !message.trim()) return;
    setBusy(true);
    try {
      await sendFn({ data: { conversationId: roomId, content: message } });
      setMessage(""); await qc.invalidateQueries({ queryKey: ["social-messages", user.id, roomId] }); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Mensagem não enviada."); }
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

  return <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" title="Voltar à vitrine"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <MessageCircle className="h-7 w-7 text-success" /><h1 className="text-lg font-bold">HS Social</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild title="Meu perfil"><Link to="/conta"><User className="h-5 w-5" /></Link></Button>
        <Button size="icon" onClick={() => setNewContact(true)} title="Nova conversa" aria-label="Nova conversa"><Plus className="h-5 w-5" /></Button>
      </div>
    </header>
    <div className="flex min-h-0 flex-1">
      <aside className={`w-full shrink-0 flex-col border-r bg-card md:w-80 ${roomId ? "hidden md:flex" : "flex"}`}>
        <div className="grid grid-cols-2 gap-1 border-b p-2">
          <Button variant={tab === "chats" ? "secondary" : "ghost"} onClick={() => setTab("chats")}><MessageCircle className="mr-2 h-4 w-4" />Conversas</Button>
          <Button variant={tab === "stories" ? "secondary" : "ghost"} onClick={() => setTab("stories")}><ImagePlus className="mr-2 h-4 w-4" />Stories</Button>
        </div>
        <div className="flex items-center gap-2 border-b p-3"><Initials name={data?.me?.full_name ?? ""} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{data?.me?.full_name || "Minha conta"}</p><p className="text-xs text-muted-foreground">{data?.me?.phone || "Telefone não cadastrado"}</p></div></div>
        {home.isPending && <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />}
        {home.error && <div className="p-4"><p role="alert" className="text-sm text-destructive">Não foi possível carregar suas conversas.</p><Button variant="outline" onClick={() => home.refetch()}>Tentar novamente</Button></div>}
        {tab === "chats" ? <>
          <div className="relative m-3"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Pesquisar conversa" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="flex-1 overflow-y-auto">
            {!home.isPending && !rooms.length && <div className="p-8 text-center"><MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhuma conversa</p><Button variant="outline" className="mt-4" onClick={() => setNewContact(true)}>Nova conversa</Button></div>}
            {rooms.filter((entry) => nameFor(entry.member_a === user.id ? entry.member_b : entry.member_a).toLowerCase().includes(search.toLowerCase())).map((entry) => {
              const name = nameFor(entry.member_a === user.id ? entry.member_b : entry.member_a);
              const latest = data?.recentMessages.find((msg) => msg.conversation_id === entry.id);
              const unread = data?.recentMessages.filter((msg) => msg.conversation_id === entry.id && msg.sender_id !== user.id && !msg.read_at).length ?? 0;
              return <Button key={entry.id} variant="ghost" onClick={() => { setRoomId(entry.id); setMessage(""); }} className={`h-auto w-full justify-start gap-3 rounded-none border-b p-4 ${entry.id === roomId ? "bg-accent" : ""}`}>
                <Initials name={name} /><span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-xs font-normal text-muted-foreground">{latest?.content || "Sem mensagens"}</span></span>{unread > 0 && <span className="rounded-full bg-success px-2 text-xs text-success-foreground">{unread}</span>}
              </Button>;
            })}
          </div>
        </> : <div className="flex-1 overflow-y-auto p-3">
          <Button className="mb-4 w-full" onClick={() => setPosting(true)}><Plus className="mr-2 h-4 w-4" />Publicar story</Button>
          {!activeStories.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum story ativo</p>}
          {storyGroups.map((group) => <Button variant="ghost" key={group.userId} onClick={() => setStoryView({ userId: group.userId, index: 0 })} className="mb-2 h-auto w-full justify-start gap-3 p-2"><span className="rounded-full p-[3px]" style={storyRing(group.stories.length)}><span className="block rounded-full bg-card p-[2px]"><Initials name={nameFor(group.userId)} /></span></span><span className="min-w-0 text-left"><span className="block truncate text-sm">{group.userId === user.id ? "Meu story" : nameFor(group.userId)}</span><span className="text-xs font-normal text-muted-foreground">{group.stories.length > 1 ? `${group.stories.length} stories · ` : ""}{new Date(group.stories[0].created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></span></Button>)}
        </div>}
      </aside>
      <main className={`min-w-0 flex-1 flex-col bg-muted/30 ${roomId ? "flex" : "hidden md:flex"}`}>
        {room ? <>
          <div className="flex h-18 shrink-0 items-center gap-3 border-b bg-card p-3"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setRoomId(null)} aria-label="Voltar às conversas"><ArrowLeft className="h-5 w-5" /></Button><Initials name={nameFor(otherId)} /><div><h2 className="text-sm font-semibold">{nameFor(otherId)}</h2><p className="text-xs text-muted-foreground">Conta HS Digital</p></div></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.isPending && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
            {messages.error && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as mensagens.</p>}
            {messages.data?.map((msg) => <div key={msg.id} className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 md:max-w-[70%] ${msg.sender_id === user.id ? "bg-success/15" : "border bg-card"}`}><p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{msg.content}</p><span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{msg.sender_id === user.id && (msg.read_at ? <CheckCheck className="h-3 w-3 text-success" /> : <Check className="h-3 w-3" />)}</span></div></div>)}<div ref={end} />
          </div>
          <form onSubmit={send} className="flex shrink-0 items-end gap-2 border-t bg-card p-3"><Textarea aria-label="Mensagem" placeholder="Digite sua mensagem…" value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} rows={1} className="max-h-32 min-h-10 resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e); } }} /><Button type="submit" size="icon" title="Enviar mensagem" aria-label="Enviar mensagem" disabled={busy || !message.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></form>
        </> : <div className="grid flex-1 place-items-center"><div className="text-center"><MessageCircle className="mx-auto mb-4 h-16 w-16 text-success" /><h2 className="text-xl font-semibold">HS Social</h2><ShieldCheck className="mx-auto mt-3 h-5 w-5 text-muted-foreground" /></div></div>}
      </main>
    </div>
    <Dialog open={newContact} onOpenChange={setNewContact}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader><form onSubmit={findContact} className="space-y-4"><label htmlFor="contact-phone" className="text-sm">Número com DDD</label><Input id="contact-phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} required /><Button type="submit" className="w-full" disabled={busy}>{busy ? "Buscando…" : "Encontrar perfil"}</Button><Button variant="link" asChild><Link to="/conta">Meu número cadastrado</Link></Button></form></DialogContent></Dialog>
    <Dialog open={posting} onOpenChange={setPosting}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Publicar story</DialogTitle></DialogHeader><form onSubmit={post} className="space-y-4">{preview && <img src={preview} alt="Prévia do story" className="max-h-64 w-full rounded-lg object-contain" />}<label className="flex cursor-pointer items-center gap-2 text-sm"><ImagePlus className="h-5 w-5 text-success" />Foto<input aria-label="Foto do story" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="min-w-0 max-w-52 text-xs" /></label><Textarea aria-label="Texto do story" placeholder="Escreva seu story…" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} /><Button className="w-full" type="submit" disabled={busy || (!caption.trim() && !file)}>{busy ? "Publicando…" : "Publicar por 24 horas"}</Button></form></DialogContent></Dialog>
    <Dialog open={Boolean(story)} onOpenChange={(open) => { if (!open) { setStoryView(null); setStoryReply(""); } }}><DialogContent className="max-w-md overflow-hidden bg-ink text-ink-foreground"><DialogHeader><DialogTitle>{story ? nameFor(story.user_id) : "Story"}</DialogTitle></DialogHeader>{story && viewGroup && storyView && <div className="space-y-4">
      <div className="flex gap-1">{viewGroup.stories.map((s, i) => <span key={s.id} className={`h-1 flex-1 rounded-full ${i <= storyView.index ? "bg-success" : "bg-muted-foreground/30"}`} />)}</div>
      <div className="flex min-h-64 items-center justify-center">{story.mediaUrl ? <img src={story.mediaUrl} alt="Story" className="max-h-[60dvh] w-full object-contain" /> : <MessageCircle className="h-16 w-16 text-success" />}</div>
      <p className="whitespace-pre-wrap break-words text-center text-lg [overflow-wrap:anywhere]">{story.caption}</p>
      {viewGroup.stories.length > 1 && <div className="flex justify-between"><Button variant="ghost" size="sm" disabled={storyView.index === 0} onClick={() => setStoryView({ userId: storyView.userId, index: storyView.index - 1 })}>Anterior</Button><Button variant="ghost" size="sm" onClick={() => storyView.index + 1 < viewGroup.stories.length ? setStoryView({ userId: storyView.userId, index: storyView.index + 1 }) : setStoryView(null)}>Próximo</Button></div>}
      {story.user_id !== user.id && <form onSubmit={replyToStory} className="flex items-center gap-2"><Input aria-label="Responder story" placeholder="Responder esse story…" value={storyReply} maxLength={1000} onChange={(e) => setStoryReply(e.target.value)} className="bg-background/10" /><Button type="submit" size="icon" aria-label="Enviar resposta" disabled={busy || !storyReply.trim()}><Send className="h-4 w-4" /></Button></form>}
      {story.user_id === user.id && <Button variant="destructive" className="w-full" onClick={async () => { try { await deleteFn({ data: { storyId: story.id } }); setStoryView(null); await refresh(); } catch { toast.error("Não foi possível remover o story."); } }}><Trash2 className="mr-2 h-4 w-4" />Excluir story</Button>}
    </div>}</DialogContent></Dialog>
  </div>;
}
