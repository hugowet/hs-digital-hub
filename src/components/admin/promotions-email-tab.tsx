import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Mail, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SITE_URL = "https://hsdigitalmarketpla.store";

type Contact = { id: string; full_name: string; email: string; created_at: string };

export function PromotionsEmailTab() {
  const { data: contacts = [], isLoading, error } = useQuery({
    queryKey: ["admin-marketing-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_marketing_contacts");
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
    refetchInterval: 60_000,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [subject, setSubject] = useState("Promoção HS Digital");
  const [message, setMessage] = useState("");

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q
      ? contacts.filter((c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      : contacts;
  }, [contacts, filter]);

  const chosen = contacts.filter((c) => selected.has(c.id));
  const allChecked = visible.length > 0 && visible.every((c) => selected.has(c.id));
  const body = `${message.trim()}\n\nConfira: ${SITE_URL}`;

  const toggleAll = () => {
    const next = new Set(selected);
    visible.forEach((c) => (allChecked ? next.delete(c.id) : next.add(c.id)));
    setSelected(next);
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const openMail = () => {
    if (!chosen.length || !message.trim()) {
      toast.error("Selecione e-mails e escreva a mensagem.");
      return;
    }
    const bcc = chosen.map((c) => c.email).join(",");
    window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-4">
      <section className="surface-card space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Mail className="h-4 w-4 text-primary" /> Escrever promoção
        </h2>
        <div>
          <Label htmlFor="promo-subject">Assunto</Label>
          <Input id="promo-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="promo-body">Mensagem</Label>
          <Textarea
            id="promo-body"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Olá! A HS Digital tem uma promoção hoje..."
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">O link {SITE_URL} entra automaticamente no final.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openMail}>
            <Mail className="mr-1 h-4 w-4" /> Enviar pelo meu e-mail ({chosen.length})
          </Button>
          <Button variant="outline" onClick={() => copy(chosen.map((c) => c.email).join(", "), "E-mails")} disabled={!chosen.length}>
            <Copy className="mr-1 h-4 w-4" /> Copiar e-mails
          </Button>
          <Button variant="outline" onClick={() => copy(body, "Mensagem")} disabled={!message.trim()}>
            <Copy className="mr-1 h-4 w-4" /> Copiar mensagem
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Abre seu aplicativo de e-mail com os contatos em cópia oculta. Envie só para quem aceita receber promoções e
          respeite quem pedir para sair da lista.
        </p>
      </section>

      <section className="surface-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Cadastrados ({contacts.length})</h2>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar" className="w-48 pl-8" />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 border-b border-border pb-2 text-sm font-medium">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Selecionar todos" />
          Selecionar todos
        </label>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>}
        {error && <p className="mt-3 text-sm text-destructive">Não foi possível carregar os contatos.</p>}
        <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
          {visible.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 py-2 text-sm">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
