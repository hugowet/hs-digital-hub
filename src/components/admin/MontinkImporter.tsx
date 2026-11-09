import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMontinkProducts, previewMontinkProduct, publishMontinkProduct } from "@/lib/montink.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const list = (v: string) => v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MontinkImporter({ storeId }: { storeId: string }) {
  const load = useServerFn(listMontinkProducts);
  const preview = useServerFn(previewMontinkProduct);
  const publishOfficial = useServerFn(publishMontinkProduct);
  const [catalog, setCatalog] = useState<Array<{id: string; title: string; price: number; image: string}>>([]);
  const [selected, setSelected] = useState<Awaited<ReturnType<typeof previewMontinkProduct>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [productionCost, setProductionCost] = useState("");
  const report = (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível consultar a Montink.");
  const [f, setF] = useState({ montinkId: "", title: "", description: "", cost: "", price: "", oldPrice: "", photos: "", colors: "Preto, Branco", sizes: "P, M, G, GG" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const cost = Number(f.cost.replace(",", ".")) || 0;
  const price = Number(f.price.replace(",", ".")) || 0;
  const oldPrice = Number(f.oldPrice.replace(",", ".")) || 0;
  const off = oldPrice > price && price > 0 ? Math.round((1 - price / oldPrice) * 100) : 0;
  const profit = price - cost - price * 0.12;

  const publish = async () => {
    const photos = list(f.photos).filter((u) => /^https:\/\//.test(u));
    if (!f.montinkId.trim() || !f.title.trim() || !photos.length || price <= 0 || cost <= 0)
      return toast.error("Preencha código Montink, título, custo, preço e pelo menos uma foto (link https).");
    if (price <= cost) return toast.error("O preço de venda precisa ser maior que o custo da Montink.");
    setSaving(true);
    const variations = [
      list(f.colors).length && { name: "Cor", options: list(f.colors), availability: "confirmed" },
      list(f.sizes).length && { name: "Tamanho", options: list(f.sizes), availability: "confirmed" },
    ].filter(Boolean);
    const { error } = await supabase.from("products").insert({
      store_id: storeId, title: f.title.trim(), description: f.description.trim(), description_long: f.description.trim(),
      price, compare_at_price: oldPrice > price ? oldPrice : null, supplier_cost: cost, image_url: photos[0], gallery_urls: photos, free_shipping: false, is_active: true,
      category: "estampas", variations: variations as any, stock: 0, supplier: "montink", product_type: "physical",
      specifications: { montink_product_id: f.montinkId.trim(), partner: "montink" },
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Estampa publicada na vitrine!");
    setF({ ...f, montinkId: "", title: "", description: "", cost: "", price: "", oldPrice: "", photos: "" });
  };

  return (
    <section className="max-w-xl space-y-4">
      <h2 className="font-semibold">Meus produtos Montink</h2>
      <Button disabled={busy} onClick={async () => { setBusy(true); try { const result = await load({data: {storeId, page: 0}}); setCatalog(result.products); } catch(e) { report(e); } finally { setBusy(false); } }}>{busy ? "Buscando…" : "Buscar meus produtos Montink"}</Button>
      <div className="divide-y divide-border">{catalog.map(p => <div key={p.id} className="flex items-center gap-3 py-3"><img src={p.image} alt={p.title} className="h-16 w-16 shrink-0 rounded object-contain"/><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{p.title}</p><p>{brl(p.price)}</p></div><Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { setSelected(await preview({data: {storeId, id: p.id}})); setProductionCost(""); } catch(e) { report(e); } finally { setBusy(false); } }}>Conferir</Button></div>)}</div>
      {selected && <section className="space-y-3 border-y border-border py-4"><h3 className="font-bold">{selected.title}</h3><p>{brl(selected.price)}</p>{selected.blocks.map((b,i) => <p key={i} className={`text-sm ${b.bold ? "font-bold" : ""}`}>{b.text}</p>)}<p className="text-sm">Cores: {selected.colors.join(", ")} · Tamanhos: {selected.sizes.join(", ") || "Único"}</p><p className="text-sm text-muted-foreground">Produção sob demanda. A disponibilidade de cores e tamanhos ainda precisa ser confirmada; o campo de estoque retornado não comprova peças prontas.</p><Label>Custo de produção Montink, sem frete (R$)</Label><Input inputMode="decimal" value={productionCost} onChange={e => setProductionCost(e.target.value)}/><p className="text-sm text-muted-foreground">Frete separado pelo CEP do comprador. Pedidos externos precisam ser pagos na Montink para produção.</p><div className="flex gap-2"><Button disabled={busy} onClick={async () => { setBusy(true); try { await publishOfficial({data: {storeId, id: selected.id, cost: Number(productionCost.replace(",", "."))}}); toast.success("Produto cadastrado na vitrine."); setSelected(null); } catch(e) { report(e); } finally { setBusy(false); } }}>Publicar este produto</Button><Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button></div></section>}
      <details><summary className="cursor-pointer text-sm font-semibold">Cadastro manual</summary><div className="mt-4 space-y-4">
      <div><Label>Código do produto na Montink</Label><Input value={f.montinkId} onChange={set("montinkId")} /></div>
      <div><Label>Título</Label><Input value={f.title} onChange={set("title")} placeholder="Camiseta Procura no Gugo" /></div>
      <div><Label>Descrição</Label><Textarea value={f.description} onChange={set("description")} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Custo Montink (R$, sem frete)</Label><Input inputMode="decimal" value={f.cost} onChange={set("cost")} /></div>
        <div><Label>Preço na vitrine (R$)</Label><Input inputMode="decimal" value={f.price} onChange={set("price")} /></div>
      </div>
      <div><Label>Preço antigo (opcional, aparece riscado)</Label><Input inputMode="decimal" value={f.oldPrice} onChange={set("oldPrice")} /></div>
      {off > 0 && <p className="text-sm text-muted-foreground">Na vitrine: <span className="line-through">{brl(oldPrice)}</span> por {brl(price)} · {off}% OFF</p>}
      {price > 0 && cost > 0 && <p className={`text-sm font-medium ${profit > 0 ? "text-success" : "text-destructive"}`}>Você recebe aprox. {brl(profit)} por peça (após comissão 12%).</p>}
      <div><Label>Links das fotos (um por linha)</Label><Textarea value={f.photos} onChange={set("photos")} placeholder="https://..." /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Cores</Label><Input value={f.colors} onChange={set("colors")} /></div>
        <div><Label>Tamanhos</Label><Input value={f.sizes} onChange={set("sizes")} /></div>
      </div>
      <Button onClick={publish} disabled={saving}>{saving ? "Publicando..." : "Publicar na vitrine"}</Button>
      </div></details>
    </section>
  );
}
