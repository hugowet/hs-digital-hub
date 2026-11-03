import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Pause, Play, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fetchAmazonProduct } from "@/lib/amazon.functions";
import { parseAmazonLinkBatch, readAmazonLinkBatch } from "@/lib/amazon-link-batch";
import { amazonNextAllowedAt } from "@/lib/amazon-request-policy";
import { confirmedAmazonStock } from "@/lib/amazon-availability";
import { calculateAmazonPrice } from "@/lib/pricing";
import { withAmazonSizeFallback } from "@/lib/amazon-variations";
import { categorizeAmazonProduct } from "@/lib/amazon-category";
import { buildAmazonDescription } from "@/lib/amazon-text";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

type ProductData = Awaited<ReturnType<typeof fetchAmazonProduct>>;
type Draft = { url: string; data: ProductData | null; error: string | null; selected: boolean; published: boolean };

export function AmazonLinkBatch({ storeId }: { storeId: string | null }) {
  const readProduct = useServerFn(fetchAmazonProduct);
  const [input, setInput] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const stop = useRef(false);
  const busy = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);
  const ready = drafts.filter((item) => item.data && !item.published);
  const selected = ready.filter((item) => item.selected);

  async function pull(resume = false) {
    if (busy.current || publishing) return;
    let rows: Draft[];
    try {
      rows = resume ? drafts : parseAmazonLinkBatch(input).map((url) => ({ url, data: null, error: null, selected: false, published: false }));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Confira os links."); return; }
    if (!resume && ready.length && !window.confirm("Substituir os produtos ainda não publicados por um novo lote?")) return;
    setDrafts(rows);
    const pending = rows.map((item, index) => ({ item, index })).filter(({ item }) => !item.data && !item.error);
    stop.current = false;
    busy.current = true;
    setRunning(true);
    try {
      await readAmazonLinkBatch({
        urls: pending.map(({ item }) => item.url),
        read: async (url) => {
          const data = await readProduct({ data: { url } });
          if (!data.title || !data.mainImage || data.costPrice <= 0) throw new Error("Dados incompletos: faltou nome, foto ou preço. Confira o anúncio.");
          return data;
        },
        result: (index, data, error) => {
          const target = pending[index];
          if (!target) return;
          setDrafts((current) => current.map((item, i) => i === target.index ? { ...item, data, error, selected: Boolean(data) } : item));
        },
        cancelled: () => stop.current,
        wait: () => new Promise((resolve) => window.setTimeout(resolve, amazonNextAllowedAt() - Date.now())),
      });
    } finally { busy.current = false; setRunning(false); }
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
        const stock = confirmedAmazonStock(data.availability, Boolean(variations.length));
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
      const urls = new Set(selected.map((item) => item.url));
      setDrafts((current) => current.map((item) => urls.has(item.url) ? { ...item, published: true, selected: false } : item));
      toast.success(`${rows.length} produto(s) publicado(s).`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não consegui publicar. Seus produtos continuam aqui."); }
    finally { setPublishing(false); }
  }

  return (
    <section aria-label="Importação de até 50 links Amazon" className="grid gap-5 border-y border-border py-5 lg:grid-cols-2">
      <div className="space-y-3">
        <Label htmlFor="amazon-batch-links">Links Amazon · até 50 produtos</Label>
        <Textarea id="amazon-batch-links" rows={6} maxLength={50000} placeholder="https://www.amazon.com.br/dp/...&#10;https://amzn.to/..." value={input} onChange={(e) => setInput(e.target.value)} disabled={running || publishing} className="font-mono text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void pull()} disabled={running || publishing || !input.trim()}><Upload className="mr-2 h-4 w-4" />Puxar dados do lote</Button>
          {running ? <Button type="button" variant="outline" onClick={() => { stop.current = true; }}><Pause className="mr-2 h-4 w-4" />Pausar</Button> : drafts.some((item) => !item.data && !item.error) && <Button type="button" variant="outline" disabled={publishing} onClick={() => void pull(true)}><Play className="mr-2 h-4 w-4" />Continuar pendentes</Button>}
        </div>
        <p className="text-xs text-muted-foreground">A leitura usa créditos. O tempo depende da Amazon e dos limites do leitor.</p>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Conferência antes de publicar</h3>
          <span aria-live="polite" className="text-xs text-muted-foreground">{drafts.filter((item) => item.data).length}/{drafts.length} lidos {running && <Loader2 className="inline h-3 w-3 animate-spin" />}</span>
        </div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto" aria-live="polite">
          {!drafts.length && <p className="py-6 text-sm text-muted-foreground">Nenhum produto lido neste lote.</p>}
          {drafts.map((item, index) => (
            <article key={item.url} className="flex items-start gap-3 rounded-md border border-border p-3">
              {item.data && <img src={item.data.mainImage} alt="" className="h-14 w-14 shrink-0 object-contain" />}
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{item.data?.title ?? `Link ${index + 1}`}</p>
                {item.data ? <>
                  <p className="text-xs text-muted-foreground">Custo {brl(item.data.costPrice)} · Venda {brl(calculateAmazonPrice(item.data.costPrice))}</p>
                  <p className="text-xs text-muted-foreground">{item.published ? "Publicado" : "Lido · ainda não publicado"}</p>
                  <p className="text-xs text-muted-foreground">{item.data.variations.map((group) => `${group.name}: ${group.options.join(", ")}`).join(" · ")}</p>
                  {(item.data.availability !== "available" || withAmazonSizeFallback(item.data.variations, item.data).length > 0) && <p className="text-xs text-destructive">Estoque ou opções não confirmados · compra bloqueada</p>}
                </> : <p className={item.error ? "break-words text-xs text-destructive" : "text-xs text-muted-foreground"}>{item.error ?? "Pendente"}</p>}
              </div>
              {item.published ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : item.data && <Checkbox aria-label={`Selecionar ${item.data.title}`} checked={item.selected} disabled={publishing || running} onCheckedChange={(checked) => setDrafts((current) => current.map((draft, i) => i === index ? { ...draft, selected: checked === true } : draft))} />}
              {!running && !publishing && !item.published && <Button type="button" variant="ghost" size="icon" aria-label={`Remover link ${index + 1}`} onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>}
            </article>
          ))}
        </div>
        <Button type="button" className="w-full" disabled={running || publishing || !storeId || !selected.length} onClick={() => void publish()}>{publishing ? "Publicando..." : `Publicar selecionados (${selected.length})`}</Button>
      </div>
    </section>
  );
}