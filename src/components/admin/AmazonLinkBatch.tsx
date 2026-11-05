import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { enqueueAmazonLinks } from "@/lib/amazon-link-queue.functions";
import { validateAmazonResultsUrl } from "@/lib/amazon-page-selection";
import { fetchAmazonProduct } from "@/lib/amazon.functions";
import { parseAmazonLinkBatch } from "@/lib/amazon-link-batch";
import { confirmedSelectedAmazonStock } from "@/lib/amazon-selected-offer";
import { calculateAmazonPrice } from "@/lib/pricing";
import { withAmazonSizeFallback } from "@/lib/amazon-variations";
import { categorizeAmazonProduct } from "@/lib/amazon-category";
import { buildAmazonDescription } from "@/lib/amazon-text";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

type ProductData = Awaited<ReturnType<typeof fetchAmazonProduct>>;
type Draft = { id: string; url: string; data: ProductData | null; error: string | null; selected: boolean; published: boolean; group?: string };

export function AmazonLinkBatch({ storeId }: { storeId: string | null }) {
  const enqueue = useServerFn(enqueueAmazonLinks);
  const [pageUrl, setPageUrl] = useState("");
  const [pageSummary, setPageSummary] = useState("");
  const [input, setInput] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [queuing, setQueuing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const ready = drafts.filter((item) => item.data && !item.published);
  const selected = ready.filter((item) => item.selected);
  // Reading happens on the server queue, so it keeps going with the app closed.
  const running = drafts.some((item) => !item.data && !item.error && !item.published);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("amazon_link_jobs").select("id,url,grp,status,data,error").order("created_at", { ascending: true }).limit(100);
    if (!data) return;
    setDrafts((current) => {
      const picked = new Map(current.map((item) => [item.id, item.selected]));
      return data.map((row) => ({
        id: row.id, url: row.url, group: row.grp ?? undefined,
        data: (row.status === "done" || row.status === "published") ? row.data as unknown as ProductData : null,
        error: row.status === "error" ? row.error : null,
        published: row.status === "published",
        selected: row.status === "done" && (picked.get(row.id) ?? true),
      }));
    });
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function pull(fromPage = false) {
    if (queuing || publishing || !storeId) return;
    try {
      if (fromPage) validateAmazonResultsUrl(pageUrl);
      else parseAmazonLinkBatch(input);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Confira os links."); return; }
    if (ready.length && !window.confirm("Substituir os produtos ainda não publicados por um novo lote?")) return;
    setQueuing(true);
    try {
      const result = await enqueue({ data: fromPage ? { storeId, pageUrl } : { storeId, links: input } });
      setPageSummary(result.summary);
      if (!result.queued) toast.info("Nenhum produto com preço e reputação suficientes nesta página.");
      else toast.success(`${result.queued} link(s) na fila. A leitura continua mesmo se você sair do aplicativo.`);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não consegui colocar na fila."); }
    finally { setQueuing(false); }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("amazon_link_jobs").delete().eq("id", id);
    if (error) toast.error("Não consegui remover."); else setDrafts((current) => current.filter((item) => item.id !== id));
  }

  async function publish() {
    if (!storeId || !selected.length || running || publishing) return;
    setPublishing(true);
    try {
      // Revalidate ownership with the current session; table RLS remains authoritative.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre novamente para publicar.");
      const { data: store, error: storeError } = await supabase.from("stores").select("id").eq("id", storeId).eq("owner_id", user.id).maybeSingle();
      if (storeError || !store) throw new Error("Você só pode publicar na sua própria loja.");
      const rows = selected.flatMap((draft) => {
        const data = draft.data;
        if (!data) return [];
        const variations = withAmazonSizeFallback(data.variations, data);
        const stock = Math.min(data.confirmedStock, confirmedSelectedAmazonStock(data.availability, variations));
        const url = new URL(draft.url);
        url.searchParams.set("tag", "hsdigitalst0c-20");
        const description = buildAmazonDescription(data.description);
        return [{
          store_id: store.id, title: data.title, description, description_long: description,
          price: calculateAmazonPrice(data.costPrice), supplier_cost: data.costPrice,
          image_url: data.mainImage, gallery_urls: [data.mainImage, ...data.gallery],
          free_shipping: true, is_active: true, supplier: "amazon", product_type: "physical",
          category: categorizeAmazonProduct(data), variations, stock,
          supplier_availability: data.availability, supplier_confirmed_quantity: stock,
          supplier_stock_checked_at: new Date().toISOString(),
          specifications: { ...data.specs, affiliate_url: url.toString(), partner: "amazon", affiliate_id: "hsdigitalst0c-20" },
        }];
      });
      const { error } = await supabase.from("products").insert(rows);
      if (error) throw error;
      const ids = selected.map((item) => item.id);
      await supabase.from("amazon_link_jobs").update({ status: "published" }).in("id", ids);
      setDrafts((current) => current.map((item) => ids.includes(item.id) ? { ...item, published: true, selected: false } : item));
      toast.success(`${rows.length} produto(s) publicado(s).`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não consegui publicar. Seus produtos continuam aqui."); }
    finally { setPublishing(false); }
  }

  return (
    <section aria-label="Importação de até 50 links Amazon" className="grid gap-5 border-y border-border py-5 lg:grid-cols-2">
      <div className="space-y-3">
        <Label htmlFor="amazon-results-page">Página Amazon · até 30 produtos</Label>
        <Input id="amazon-results-page" type="url" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://www.amazon.com.br/s?k=furadeira" disabled={queuing || publishing} />
        <Button type="button" variant="outline" onClick={() => void pull(true)} disabled={queuing || publishing || !pageUrl.trim()}><Upload className="mr-2 h-4 w-4" />Puxar 15 baratos + 15 intermediários</Button>
        {pageSummary && <p className="text-xs text-muted-foreground" aria-live="polite">{pageSummary}</p>}
        <div className="border-t border-border" />
        <Label htmlFor="amazon-batch-links">Links Amazon · até 50 produtos</Label>
        <Textarea id="amazon-batch-links" rows={6} maxLength={50000} placeholder="https://www.amazon.com.br/dp/...&#10;https://amzn.to/..." value={input} onChange={(e) => setInput(e.target.value)} disabled={queuing || publishing} className="font-mono text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void pull()} disabled={queuing || publishing || !input.trim()}><Upload className="mr-2 h-4 w-4" />{queuing ? "Colocando na fila..." : "Puxar dados do lote"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">A leitura roda em segundo plano: pode sair do aplicativo que ela continua até terminar. Usa créditos e respeita as pausas da Amazon.</p>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Conferência antes de publicar</h3>
          <span aria-live="polite" className="text-xs text-muted-foreground">{drafts.filter((item) => item.data).length}/{drafts.length} lidos {running && <Loader2 className="inline h-3 w-3 animate-spin" />}</span>
        </div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto" aria-live="polite">
          {!drafts.length && <p className="py-6 text-sm text-muted-foreground">Nenhum produto lido neste lote.</p>}
          {drafts.map((item, index) => (
            <article key={item.id} className="flex items-start gap-3 rounded-md border border-border p-3">
              {item.data && <img src={item.data.mainImage} alt="" className="h-14 w-14 shrink-0 object-contain" />}
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{item.data?.title ?? `Link ${index + 1}`}</p>
                {item.group && <p className="text-xs text-muted-foreground">{item.group === "barato" ? "Mais barato da página" : "Preço intermediário da página"}</p>}
                {item.data ? <>
                  <p className="text-xs text-muted-foreground">Custo {brl(item.data.costPrice)} · Venda {brl(calculateAmazonPrice(item.data.costPrice))}</p>
                  <p className="text-xs text-muted-foreground">{item.published ? "Publicado" : "Lido · ainda não publicado"}</p>
                  <p className="text-xs text-muted-foreground">{item.data.variations.map((group) => `${group.name}: ${group.options.join(", ")}`).join(" · ")}</p>
                  {Math.min(item.data.confirmedStock, confirmedSelectedAmazonStock(item.data.availability, withAmazonSizeFallback(item.data.variations, item.data))) > 0
                    ? <p className="text-xs text-primary">Estoque confirmado automaticamente · somente a opção exibida</p>
                    : <p className="text-xs text-destructive">Amazon não confirmou estoque ou opção · compra bloqueada</p>}
                </> : <p className={item.error ? "break-words text-xs text-destructive" : "text-xs text-muted-foreground"}>{item.error ?? "Na fila · lendo em segundo plano"}</p>}
              </div>
              {item.published ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : item.data && <Checkbox aria-label={`Selecionar ${item.data.title}`} checked={item.selected} disabled={publishing} onCheckedChange={(checked) => setDrafts((current) => current.map((draft, i) => i === index ? { ...draft, selected: checked === true } : draft))} />}
              {!publishing && !item.published && <Button type="button" variant="ghost" size="icon" aria-label={`Remover link ${index + 1}`} onClick={() => void remove(item.id)}><Trash2 className="h-4 w-4" /></Button>}
            </article>
          ))}
        </div>
        <Button type="button" className="w-full" disabled={publishing || !storeId || !selected.length} onClick={() => void publish()}>{publishing ? "Publicando..." : `Publicar selecionados (${selected.length})`}</Button>
      </div>
    </section>
  );
}