import { Check, Copy, Package, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentDeliveryStep, deliverySteps } from "@/lib/order-delivery";

export function OrderPhoto({ src, title }: { src?: string | null; title: string }) {
  return <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-background">
    {src ? <img src={src} alt={title} loading="lazy" className="h-full w-full object-contain" onError={event => { event.currentTarget.hidden = true; }} /> : <Package className="h-7 w-7 text-muted-foreground" />}
  </div>;
}

export function OrderTracking({ events, paid, fulfillments }: {
  events: Array<{ status: string; created_at?: string; note?: string }>;
  paid: boolean;
  fulfillments: Array<{ tracking_code: string | null; tracking_carrier: string | null }>;
}) {
  const current = currentDeliveryStep(events, paid);
  const codes = fulfillments.filter(item => item.tracking_code);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-semibold"><Truck className="h-5 w-5 text-primary" />Acompanhe a entrega</h2><span className="text-sm font-medium text-primary">{deliverySteps[current]?.[1] ?? "Aguardando pagamento"}</span></div>
    {codes.length ? codes.map((item, index) => <div key={`${item.tracking_code}-${index}`} className="flex items-center gap-2 border-b border-border pb-3 text-sm"><div className="min-w-0 flex-1"><p className="text-muted-foreground">{item.tracking_carrier || "Transportadora"}</p><p className="break-all font-mono font-semibold">{item.tracking_code}</p></div><Button size="icon" variant="ghost" title="Copiar rastreio" aria-label="Copiar rastreio" onClick={async () => { try { await navigator.clipboard.writeText(item.tracking_code ?? ""); toast.success("Rastreio copiado"); } catch { toast.error("Não foi possível copiar o rastreio."); } }}><Copy className="h-4 w-4" /></Button></div>) : <p className="text-sm text-muted-foreground">{paid ? "Código de rastreio ainda não informado." : "A entrega começa após a confirmação do pagamento."}</p>}
    <ol className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">{deliverySteps.map(([status, label], index) => <li key={status} aria-current={index === current ? "step" : undefined} className="flex items-center gap-3 sm:block"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${index <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index < current ? <Check className="h-4 w-4" /> : index + 1}</span><p className={`text-xs sm:mt-2 ${index === current ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</p></li>)}</ol>
    {events.length > 0 && <div className="space-y-2 border-t border-border pt-3">{[...events].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 4).map((event, index) => <div key={index} className="text-xs"><p>{event.note || deliverySteps.find(([status]) => status === event.status)?.[1]}</p>{event.created_at && <time className="text-muted-foreground">{new Date(event.created_at).toLocaleString("pt-BR")}</time>}</div>)}</div>}
  </div>;
}