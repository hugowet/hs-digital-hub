import { confirmedAmazonStock, extractAmazonAvailability } from "./amazon-availability";

export async function checkAmazonStock(supabaseAdmin: any, product: any) {
  const rawUrl = String(product.specifications?.affiliate_url ?? "");
  let html = "";
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || !["amazon.com.br", "www.amazon.com.br"].includes(url.hostname) || !/\/(?:dp|gp\/product)\/[a-z0-9]{10}/i.test(url.pathname)) throw new Error("Invalid product URL");
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
  } catch { /* Unreadable pages fail closed, never become available. */ }
  const availability = extractAmazonAvailability(html);
  const quantity = confirmedAmazonStock(availability, Boolean(product.variations?.length));
  const { error } = await supabaseAdmin.from("products").update({
    supplier_availability: availability, supplier_stock_checked_at: new Date().toISOString(),
    supplier_confirmed_quantity: quantity, stock: quantity,
  }).eq("id", product.id).eq("supplier", "amazon");
  if (error) throw error;
  return quantity;
}

export async function refreshAmazonStockBatch(supabaseAdmin: any, storeId: string) {
  const { data, error } = await supabaseAdmin.from("products")
    .select("id,specifications,variations").eq("supplier", "amazon").eq("store_id", storeId)
    .order("supplier_stock_checked_at", { ascending: true, nullsFirst: true }).order("id").limit(6);
  if (error) throw error;
  const results = await Promise.allSettled((data ?? []).map((p: any) => checkAmazonStock(supabaseAdmin, p)));
  return { checked: results.length, available: results.filter((r) => r.status === "fulfilled" && r.value > 0).length };
}

export async function assertAmazonStock(supabaseAdmin: any, items: { productId: string; quantity: number }[]) {
  const { data, error } = await supabaseAdmin.from("products").select("id,specifications,variations")
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