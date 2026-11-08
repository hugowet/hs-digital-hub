import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const list = (v: string) => v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MontinkImporter({ storeId }: { storeId: string }) {
  const [f, setF] = useState({ montinkId: "", title: "", description: "", cost: "", price: "", photos: "", colors: "Preto, Branco", sizes: "P, M, G, GG" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const cost = Number(f.cost.replace(",", ".")) || 0;
  const price = Number(f.price.replace(",", ".")) || 0;
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
      price, supplier_cost: cost, image_url: photos[0], gallery_urls: photos, free_shipping: true, is_active: true,
      category: "estampas", variations: variations as any, stock: 999, supplier: "montink", product_type: "physical",
      specifications: { montink_product_id: f.montinkId.trim(), partner: "montink" },
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Estampa publicada na vitrine!");
    setF({ ...f, montinkId: "", title: "", description: "", cost: "", price: "", photos: "" });
  };

  return (
    <section className="max-w-xl space-y-4">
      <div className="rounded-md border border-border bg-muted/40 p-4">
        <h2 className="font-semibold">Importador Montink</h2>
        <p className="mt-1 text-sm text-muted-foreground">Crie a estampa na Montink, copie o código do produto e as fotos. Quando o pagamento for aprovado, o pedido vai sozinho para a Montink produzir e enviar.</p>
      </div>
      <div><Label>Código do produto na Montink</Label><Input value={f.montinkId} onChange={set("montinkId")} /></div>
      <div><Label>Título</Label><Input value={f.title} onChange={set("title")} placeholder="Camiseta Procura no Gugo" /></div>
      <div><Label>Descrição</Label><Textarea value={f.description} onChange={set("description")} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Custo Montink (R$, com frete)</Label><Input inputMode="decimal" value={f.cost} onChange={set("cost")} /></div>
        <div><Label>Preço na vitrine (R$)</Label><Input inputMode="decimal" value={f.price} onChange={set("price")} /></div>
      </div>
      {price > 0 && cost > 0 && <p className={`text-sm font-medium ${profit > 0 ? "text-success" : "text-destructive"}`}>Você recebe aprox. {brl(profit)} por peça (após comissão 12%).</p>}
      <div><Label>Links das fotos (um por linha)</Label><Textarea value={f.photos} onChange={set("photos")} placeholder="https://..." /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Cores</Label><Input value={f.colors} onChange={set("colors")} /></div>
        <div><Label>Tamanhos</Label><Input value={f.sizes} onChange={set("sizes")} /></div>
      </div>
      <Button onClick={publish} disabled={saving}>{saving ? "Publicando..." : "Publicar na vitrine"}</Button>
    </section>
  );
}
