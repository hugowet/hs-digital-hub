import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordSellerDeliveryAttempt } from "@/lib/shipping.functions";
import { deliveryAttemptInput } from "@/lib/delivery-attempt";

export function SellerDeliveryAttempt({ orderId, storeId, disabled, events }: {
  orderId: string; storeId: string; disabled: boolean;
  events: Array<{ status: string; note?: string | null; occurred_at?: string | null; created_at?: string }>;
}) {
  const save = useServerFn(recordSellerDeliveryAttempt);
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const attempts = events.filter(event => event.status === "delivery_attempted");
  return <section className="space-y-3 border-t border-border pt-3">
    <Button variant="outline" disabled={disabled || saving} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}><AlertCircle className="h-4 w-4" />{expanded ? "Fechar tentativa de entrega" : "Registrar tentativa de entrega"}</Button>
    {expanded && <>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="min-w-0 space-y-1"><Label htmlFor={`attempt-time-${orderId}`}>Data e horário da tentativa</Label><Input id={`attempt-time-${orderId}`} type="datetime-local" value={date} disabled={disabled || saving} className="min-w-0 max-w-full" onChange={event => setDate(event.target.value)} /></div>
      <div className="min-w-0 space-y-1"><Label htmlFor={`attempt-note-${orderId}`}>Motivo / mensagem ao cliente</Label><Textarea id={`attempt-note-${orderId}`} value={note} maxLength={500} disabled={disabled || saving} placeholder="Ex.: destinatário ausente. Nova tentativa informada pela transportadora." onChange={event => setNote(event.target.value)} /></div>
    </div>
    <Button variant="outline" disabled={disabled || saving || !date || !note.trim()} onClick={async () => {
      setSaving(true);
      try {
        const input = deliveryAttemptInput.parse({ orderId, storeId, occurredAt: new Date(date).toISOString(), note });
        await save({ data: input });
        await qc.invalidateQueries({ queryKey: ["store-orders-tracking", storeId] });
        setDate(""); setNote(""); setExpanded(false); toast.success("Tentativa registrada para o cliente acompanhar.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a tentativa."); }
      finally { setSaving(false); }
    }}>{saving ? "Salvando…" : "Registrar tentativa"}</Button>
    <Button variant="ghost" disabled={saving} onClick={() => { setDate(""); setNote(""); setExpanded(false); }}>Cancelar tentativa</Button>
    </>}
    {attempts.length > 0 && <ol className="space-y-2">{attempts.map((event, index) => <li key={`${event.created_at}-${index}`} className="border-l-2 border-primary pl-3 text-sm">
      <p className="text-xs text-muted-foreground">{new Date(event.occurred_at ?? event.created_at ?? "").toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p><p className="whitespace-pre-wrap break-words">{event.note}</p>
    </li>)}</ol>}
  </section>;
}