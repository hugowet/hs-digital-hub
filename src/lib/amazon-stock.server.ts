import { parseHTML } from "linkedom";
import { confirmedAmazonStock, extractAmazonAvailability } from "./amazon-availability";
import { extractDescription, extractSpecs } from "./amazon.functions";
import { extractAmazonOptions, shouldReplaceOptions } from "./amazon-options";
import { amazonHiResFromHtml } from "./amazon-image";
import { AMAZON_DELIVERY_METHOD_TEXT, buildAmazonDescription, sanitizeAmazonSpecs } from "./amazon-text";

export async function checkAmazonStock(supabaseAdmin: any, product: any) {
  const rawUrl = String(product.specifications?.affiliate_url ?? "");
  let html = "";
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || !["amazon.com.br", "www.amazon.com.br"].includes(url.hostname) || !/\/(?:dp|gp\/product)\/[a-z0-9]{10}/i.test(url.pathname)) {
      throw new Error("Invalid product URL");
    }
    const key = process.env["LOVABLE_API_KEY"];
    const connection = process.env["FIRECRAWL_API_KEY"];
    if (!key || !connection) throw new Error("Missing reader configuration");
    const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
      method: "POST", signal: AbortSignal.timeout(25000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connection },
      body: JSON.stringify({ url: url.toString(), formats: ["rawHtml"], maxAge: 0, onlyMainContent: false, location: { country: "BR", languages: ["pt-BR"] } }),
    });
    if (!response.ok) throw new Error("Supplier read failed");
    const payload = await response.json();
    html = String(payload?.data?.rawHtml ?? payload?.rawHtml ?? "");
  } catch {
    // Failed reads never authorize checkout from stale or invented stock.
    return 0;
  }

  const availability = extractAmazonAvailability(html);
  const patch: Record<string, unknown> = {};
  // Restaura descrição completa / especificações / tamanhos e cores quando faltarem.
  // Corrige a galeria: somente as fotos do próprio anúncio.
  const ownImages = amazonHiResFromHtml(html).slice(0, 10);
  if (ownImages.length) {
    patch.image_url = ownImages[0];
    patch.gallery_urls = ownImages.slice(1);
  }
  try {
    const { document } = parseHTML(html);
    const desc = extractDescription(document);
    const current = String(product.description ?? "").replace(AMAZON_DELIVERY_METHOD_TEXT, "").trim();
    if (desc && desc.length > current.length + 40) patch.description = buildAmazonDescription(desc);
    const options = extractAmazonOptions(html);
    if (shouldReplaceOptions(product.variations, options)) patch.variations = options;
    const specs = sanitizeAmazonSpecs(extractSpecs(document));
    const oldSpecs = product.specifications ?? {};
    const userSpecCount = Object.keys(oldSpecs).filter((k) => k !== "affiliate_url" && !k.startsWith("_")).length;
    if (Object.keys(specs).length > userSpecCount) patch.specifications = { ...specs, ...oldSpecs };
  } catch { /* conteúdo opcional */ }
  const variations = (patch.variations as any[]) ?? product.variations;
  const quantity = confirmedAmazonStock(availability, Boolean(variations?.length));

  const { error } = await supabaseAdmin.from("products").update({
    ...patch,
    stock: quantity,
    supplier_availability: availability,
    supplier_confirmed_quantity: quantity,
    supplier_stock_checked_at: new Date().toISOString(),
  }).eq("id", product.id).eq("supplier", "amazon");

  if (error) throw error;
  return quantity;
}

export async function refreshAmazonStockBatch(supabaseAdmin: any, storeId: string) {
  const { data, error } = await supabaseAdmin.from("products")
    .select("id,description,specifications,variations,stock").eq("supplier", "amazon").eq("store_id", storeId)
    .order("supplier_stock_checked_at", { ascending: true, nullsFirst: true }).order("id").limit(6);
  if (error) throw error;
  const results = await Promise.allSettled((data ?? []).map((p: any) => checkAmazonStock(supabaseAdmin, p)));
  return { checked: results.length, available: results.filter((r) => r.status === "fulfilled" && r.value > 0).length };
}

export async function assertAmazonStock(supabaseAdmin: any, items: { productId: string; quantity: number }[]) {
  const { data, error } = await supabaseAdmin.from("products").select("id,description,specifications,variations,stock")
    .eq("supplier", "amazon").in("id", items.map((item) => item.productId));
  if (error) throw error;
  for (let i = 0; i < (data ?? []).length; i += 6) {
    await Promise.all(data.slice(i, i + 6).map(async (product: any) => {
      const quantity = await checkAmazonStock(supabaseAdmin, product);
      const requested = items.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
      if (quantity < requested) throw new Error("Produto indisponível ou quantidade não confirmada pelo fornecedor. Atualize o carrinho antes de pagar.");
    }));
  }
}
