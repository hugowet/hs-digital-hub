import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { montinkData } from "./montink";

async function authorize(context: any, storeId: string) {
  const { data: identity, error } = await context.supabase.auth.getUser();
  const { data: store } = await context.supabase.from("stores").select("id").eq("id", storeId).eq("owner_id", context.userId).eq("status", "approved").maybeSingle();
  if (error || identity?.user?.email?.toLowerCase() !== "hugohug12ou@gmail.com" || !store) throw new Error("Acesso restrito ao proprietário autorizado.");
}
const input = z.object({ storeId: z.string().uuid(), page: z.number().int().min(0).max(100).default(0) });
export const listMontinkProducts = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(v => input.parse(v)).handler(async ({ data, context }) => {
  await authorize(context, data.storeId);
  const { montinkRead } = await import("./montink-api.server");
  const body = await montinkRead(`/products?pga=${data.page}&pp=30`, process.env["MONTINK_API_TOKEN"]);
  return { products: (body.produtos ?? []).map((p: any) => ({ id: String(p.id), title: String(p.nomeShopify), price: Number(p.preco_final), image: typeof p.image_url === "string" && p.image_url.startsWith("https://") ? p.image_url : Object.values(JSON.parse(p.imgVariacoes || "{}"))[0] as string ?? "" })), page: data.page };
});
export const previewMontinkProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(v => z.object({ storeId: z.string().uuid(), id: z.string().regex(/^\d+$/) }).parse(v)).handler(async ({ data, context }) => {
  await authorize(context, data.storeId);
  const { montinkRead, montinkDescription } = await import("./montink-api.server");
  const product = montinkData(await montinkRead(`/product/${data.id}`, process.env["MONTINK_API_TOKEN"]));
  return { ...product, blocks: await montinkDescription(product.html) };
});
export const publishMontinkProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(v => z.object({ storeId: z.string().uuid(), id: z.string().regex(/^\d+$/), cost: z.number().positive() }).parse(v)).handler(async ({ data, context }) => {
  await authorize(context, data.storeId);
  const { montinkRead, montinkDescription } = await import("./montink-api.server");
  const p = montinkData(await montinkRead(`/product/${data.id}`, process.env["MONTINK_API_TOKEN"]));
  const { data: settings, error: settingsError } = await context.supabase.from("platform_settings").select("commission_rate").eq("id", true).single();
  if (settingsError || !settings || p.price * (1 - Number(settings.commission_rate)) <= data.cost) throw new Error("Preço não cobre custo e comissão. Confira os valores antes de publicar.");
  const { data: existing } = await context.supabase.from("products").select("id").eq("store_id", data.storeId).eq("supplier", "montink").eq("supplier_product_id", p.id).maybeSingle();
  if (existing) throw new Error("Este produto já foi cadastrado na HS Digital.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const photos: string[] = []; const colorImages: Record<string, string> = {};
  for (const [index, image] of p.images.slice(0, 10).entries()) {
    const url = new URL(image.url);
    if (url.protocol !== "https:" || url.hostname !== "r2.mont.ink") throw new Error("Foto fora do endereço oficial Montink.");
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Foto Montink indisponível.");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Foto Montink excede o limite.");
    const path = `${data.storeId}/montink/${p.id}/${crypto.randomUUID()}-${index}.jpg`;
    const { error } = await supabaseAdmin.storage.from("product-images").upload(path, bytes, { contentType: response.headers.get("content-type") ?? "image/jpeg" });
    if (error) throw error;
    photos.push(path); if (image.color) colorImages[image.color] = path;
  }
  if (!photos.length) throw new Error("Produto sem foto oficial.");
  const blocks = await montinkDescription(p.html);
  const variations = [{ name: "Cor", options: p.colors, availability: "confirmed", images: colorImages }, ...(p.sizes.length ? [{ name: "Tamanho", options: p.sizes, availability: "confirmed" }] : [])];
  const { data: saved, error } = await context.supabase.from("products").insert({ store_id: data.storeId, title: p.title, price: p.price, supplier_cost: data.cost, supplier: "montink", supplier_product_id: p.id, category: "estampas", product_type: "physical", stock: p.stock, free_shipping: false, is_active: true, image_url: photos[0], gallery_urls: photos, description: blocks.map(b => b.text).join("\n\n"), description_long: blocks.map(b => b.text).join("\n\n"), variations, specifications: { montink_product_id: p.id, montink_description_blocks: blocks, shipping_origin: "national", montink_stock_confirmed: true } } as any).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "Este produto já foi cadastrado." : error.message);
  return { id: saved.id, stock: p.stock };
});