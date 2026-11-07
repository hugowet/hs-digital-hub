import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Star, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateSellerProduct } from "@/lib/products.functions";
import { sellerEditSchema } from "@/lib/seller-product-edit";
import { CATEGORIES } from "@/lib/catalog";
import { BR_SIZES, US_SIZES, OPTION_COLORS, productShippingOrigin } from "@/lib/manual-product-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Photo = { storagePath?: string; url?: string; preview: string; file?: File; mediaType: "image" | "video"; mimeType?: string; sizeBytes?: number };
type EditableProduct = {
  id: string; store_id: string; title: string; description?: string; description_long?: string;
  price: number; stock: number; category: string; supplier?: string; supplier_cost?: number; supplier_cost_currency?: string;
  shipping_origin?: string; weight_kg?: number; height_cm?: number; width_cm?: number; length_cm?: number;
  image_url?: string; gallery_urls?: string[];
  variations?: Array<{ name: string; options: string[] }>;
  product_media?: Array<{ storage_path: string; media_type: "image" | "video"; mime_type: string; size_bytes: number; position: number }>;
};

function initialPhotos(product: EditableProduct): Photo[] {
  const rows = [...(product.product_media ?? [])].sort((a, b) => a.position - b.position);
  const urls = [...new Set([product.image_url, ...(product.gallery_urls ?? []), ...rows.map(r => r.storage_path)].filter((v): v is string => Boolean(v)))];
  return urls.map(value => {
    const row = rows.find(r => r.storage_path === value);
    return { ...(value.startsWith("https://") ? { url: value } : { storagePath: value }), preview: value.startsWith("https://") ? value : "", mediaType: row?.media_type ?? "image", mimeType: row?.mime_type, sizeBytes: row?.size_bytes };
  });
}

export function SellerProductEditor({ product, onSaved, onCancel }: { product: EditableProduct; onSaved: () => void; onCancel: () => void }) {
  const save = useServerFn(updateSellerProduct);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({ title: product.title, description: product.description ?? "", descriptionLong: product.description_long ?? "", price: String(product.price), supplierCost: product.supplier_cost == null ? "" : String(product.supplier_cost), stock: String(product.stock), category: product.category, shippingOrigin: productShippingOrigin(product) ?? "", weightKg: product.weight_kg == null ? "" : String(product.weight_kg), heightCm: product.height_cm == null ? "" : String(product.height_cm), widthCm: product.width_cm == null ? "" : String(product.width_cm), lengthCm: product.length_cm == null ? "" : String(product.length_cm) });
  const [options, setOptions] = useState(() => Object.fromEntries(["Cor", "Tamanho", "Tamanho (US)"].map(name => [name, product.variations?.find(g => g.name === name)?.options.join(", ") ?? ""])));
  const [optionsChanged, setOptionsChanged] = useState(false);
  const [photos, setPhotos] = useState(() => initialPhotos(product));
  const [photosChanged, setPhotosChanged] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  useEffect(() => {
    let live = true;
    const paths = photos.flatMap(p => p.storagePath ? [p.storagePath] : []);
    if (paths.length) void supabase.storage.from("product-images").createSignedUrls(paths, 3600).then(({ data, error }) => {
      if (!live) return;
      if (error) { toast.error("Não foi possível carregar as fotos. Elas serão preservadas ao salvar."); return; }
      const signed = new Map(data?.map(r => [r.path, r.signedUrl]));
      setPhotos(old => old.map(p => ({ ...p, preview: p.storagePath ? signed.get(p.storagePath) ?? p.preview : p.preview })));
    });
    return () => { live = false; objectUrls.current.forEach(URL.revokeObjectURL); };
  }, [product.id]);
  const change = (key: keyof typeof fields, value: string) => setFields(old => ({ ...old, [key]: value }));
  const values = (text: string) => [...new Set(text.split(",").map(v => v.trim()).filter(Boolean))];
  const toggle = (name: string, value: string) => {
    const current = values(options[name] ?? "");
    setOptions(old => ({ ...old, [name]: (current.includes(value) ? current.filter(v => v !== value) : [...current, value]).join(", ") }));
    setOptionsChanged(true);
  };
  const uploadPhotos = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (photos.length + selected.length > 10) { toast.error("O limite é de 10 fotos."); return; }
    if (selected.some(f => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type) || f.size > 50 * 1024 * 1024)) { toast.error("Use JPG, PNG, WEBP ou GIF de até 50 MB."); return; }
    setPhotos(old => [...old, ...selected.map(file => {
      const preview = URL.createObjectURL(file); objectUrls.current.push(preview);
      return { file, preview, mediaType: "image" as const, mimeType: file.type, sizeBytes: file.size };
    })]);
    setPhotosChanged(true);
    if (input.current) input.current.value = "";
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const number = (v: string) => v.trim() ? Number(v.replace(",", ".")) : null;
    setBusy(true);
    try {
      const pending = sellerEditSchema.parse({ ...fields, productId: product.id, price: number(fields.price), stock: number(fields.stock), supplierCost: number(fields.supplierCost), weightKg: number(fields.weightKg), heightCm: number(fields.heightCm), widthCm: number(fields.widthCm), lengthCm: number(fields.lengthCm), variations: optionsChanged ? Object.entries(options).flatMap(([name, text]) => values(text).length ? [{ name, options: values(text) }] : []) : null, media: photosChanged ? photos.map((p, i) => ({ ...p, ...(p.file ? { storagePath: `${product.store_id}/${crypto.randomUUID()}_${i}.${p.file.type === "image/jpeg" ? "jpg" : p.file.type.split("/")[1]}` } : {}) })) : null });
      if (pending.media) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i]; const path = pending.media[i]?.storagePath;
          if (!photo?.file || !path) continue;
          const { error } = await supabase.storage.from("product-images").upload(path, photo.file, { contentType: photo.file.type, cacheControl: "3600" });
          if (error) throw new Error(`Não foi possível enviar a foto ${i + 1}.`);
        }
      }
      await save({ data: pending });
      toast.success("Alterações salvas!"); onSaved();
    } catch (error) {
      const issues = (error as { issues?: Array<{ message: string }> }).issues;
      toast.error(issues?.[0]?.message ?? (error instanceof Error ? error.message : "Não foi possível salvar."));
    } finally { setBusy(false); }
  };
  return <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl" onInteractOutside={event => { if (busy) event.preventDefault(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
    <DialogHeader><DialogTitle>Editar produto</DialogTitle><DialogDescription>{product.title}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <div><Label htmlFor="edit-title">Título do produto</Label><Input id="edit-title" value={fields.title} onChange={e => change("title", e.target.value)} required maxLength={160} /></div>
        <div className="grid grid-cols-2 gap-3">{([["price", "Preço de venda (R$)"], ["supplierCost", `Preço de custo (${product.supplier_cost_currency ?? "BRL"})`], ["stock", "Estoque"]] as const).map(([key, label]) => <div key={key}><Label htmlFor={`edit-${key}`}>{label}</Label><Input id={`edit-${key}`} type="number" step={key === "stock" ? "1" : "0.01"} min={key === "price" ? "0.01" : "0"} required={key !== "supplierCost"} value={fields[key]} onChange={e => change(key, e.target.value)} /></div>)}
          <div><Label htmlFor="edit-category">Categoria</Label><select id="edit-category" required value={fields.category} onChange={e => change("category", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Escolha a categoria</option>{!CATEGORIES.some(c => c.slug === fields.category) && fields.category && <option value={fields.category}>{fields.category}</option>}{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></div>
        </div>
        <fieldset><legend className="mb-2 text-sm font-semibold">Origem do envio</legend><div className="flex flex-wrap gap-2">{([["national", "Nacional · envio do Brasil"], ["international", "Importado · envio do exterior"]] as const).map(([value, label]) => <Button key={value} type="button" aria-pressed={fields.shippingOrigin === value} variant={fields.shippingOrigin === value ? "default" : "outline"} onClick={() => change("shippingOrigin", value)}>{label}</Button>)}</div></fieldset>
        {([["Cor", "Cores disponíveis", OPTION_COLORS], ["Tamanho", "Tamanhos / numerações (BR)", BR_SIZES], ["Tamanho (US)", "Tamanhos / numerações (US)", US_SIZES]] as const).map(([name, label, presets]) => <fieldset key={name} className="space-y-2"><legend className="text-sm font-semibold">{label}</legend><div className="flex flex-wrap gap-1">{presets.map(value => <Button key={value} size="sm" type="button" variant={values(options[name] ?? "").includes(value) ? "default" : "outline"} aria-pressed={values(options[name] ?? "").includes(value)} onClick={() => toggle(name, value)}>{value}</Button>)}</div><Label htmlFor={`edit-${name}`}>{label} — separados por vírgula</Label><Input id={`edit-${name}`} value={options[name] ?? ""} onChange={e => { setOptions(old => ({ ...old, [name]: e.target.value })); setOptionsChanged(true); }} /></fieldset>)}
        <div className="grid grid-cols-2 gap-3">{([["weightKg", "Peso (kg)"], ["heightCm", "Altura (cm)"], ["widthCm", "Largura (cm)"], ["lengthCm", "Comprimento (cm)"]] as const).map(([key, label]) => <div key={key}><Label htmlFor={`edit-${key}`}>{label}</Label><Input id={`edit-${key}`} type="number" step="0.01" min="0.01" value={fields[key]} onChange={e => change(key, e.target.value)} /></div>)}</div>
        <div><Label htmlFor="edit-description">Descrição</Label><Textarea id="edit-description" rows={5} value={fields.description} onChange={e => change("description", e.target.value)} /></div>
        <div><Label htmlFor="edit-descriptionLong">Descrição completa</Label><Textarea id="edit-descriptionLong" rows={5} value={fields.descriptionLong} onChange={e => change("descriptionLong", e.target.value)} /></div>
        <div className="space-y-2"><Label>Fotos do produto ({photos.length}/10)</Label><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((photo, index) => <div key={photo.storagePath ?? photo.url ?? photo.preview} className="space-y-1"><div className="aspect-square overflow-hidden rounded-md border bg-muted">{photo.preview && (photo.mediaType === "video" ? <video src={photo.preview} controls className="h-full w-full object-contain" /> : <img src={photo.preview} alt={`Foto ${index + 1}`} className="h-full w-full object-contain" />)}</div><div className="flex items-center justify-between gap-1"><Button type="button" size="sm" variant={index === 0 ? "default" : "outline"} aria-label={`Definir foto ${index + 1} como capa`} onClick={() => { setPhotos(old => [old[index], ...old.filter((_, i) => i !== index)]); setPhotosChanged(true); }}><Star className="size-3" />{index === 0 ? "Capa" : "Capa"}</Button><Button type="button" size="icon" variant="ghost" aria-label={`Remover foto ${index + 1}`} onClick={() => { setPhotos(old => old.filter((_, i) => i !== index)); setPhotosChanged(true); }}><Trash2 className="size-4" /></Button></div></div>)}</div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={e => uploadPhotos(e.target.files)} /><Button type="button" variant="outline" disabled={photos.length >= 10} onClick={() => input.current?.click()}><Upload className="size-4" />Adicionar fotos</Button></div>
      </fieldset>
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-background py-3"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar alterações"}</Button></div>
    </form>
  </DialogContent>;
}