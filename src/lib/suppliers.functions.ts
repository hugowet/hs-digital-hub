import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ownedStore(context: { supabase: any; userId: string }, storeId: string) {
  const { data } = await context.supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (!data) throw new Error("Loja não encontrada.");
}

const storeSchema = z.object({ storeId: z.string().uuid() });

export const getCjSupplierStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => storeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ownedStore(context, data.storeId);
    const db = context.supabase;
    const base = () => db.from("products").select("id", { count: "exact", head: true }).eq("store_id", data.storeId).eq("supplier", "cj").is("supplier_variant_parent_id", null);
    const [total, active, translated, details, jobs, catalog] = await Promise.all([
      base(), base().eq("is_active", true), base().eq("supplier_locale", "pt-BR"),
      base().gte("supplier_content_version", 1),
      db.from("supplier_content_jobs").select("operation,status,processed,pause_reason,updated_at").eq("store_id", data.storeId),
      db.from("supplier_import_jobs").select("status,completed_categories,total_categories,imported_products,pause_reason").eq("store_id", data.storeId).eq("provider", "cj").maybeSingle(),
    ]);
    for (const result of [total, active, translated, details, jobs, catalog]) if (result.error) throw result.error;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integ } = await supabaseAdmin.from("supplier_integrations").select("auto_sync").eq("store_id", data.storeId).eq("provider", "cj").maybeSingle();
    return { total: total.count ?? 0, active: active.count ?? 0, translated: translated.count ?? 0,
      details: details.count ?? 0, jobs: jobs.data ?? [], catalog: catalog.data, autoImport: integ?.auto_sync ?? true };
  });

export const updateCjContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), operation: z.enum(["titles", "details"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await ownedStore(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("supplier_content_jobs").upsert({ store_id: data.storeId, operation: data.operation }, { onConflict: "store_id,operation", ignoreDuplicates: true });
    if (error) throw error;
    // A fresh, explicit owner action is the only way to resume a blocked job.
    const { error: resumeError } = await supabaseAdmin.from("supplier_content_jobs")
      .update({ status: "pending", pause_reason: null }).eq("store_id", data.storeId)
      .eq("operation", data.operation).in("status", ["paused", "completed"]);
    if (resumeError) throw resumeError;
    const { processCjContentJob } = await import("@/lib/cj-content.server");
    return processCjContentJob(supabaseAdmin, data.storeId, data.operation);
  });

export const syncCjProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => storeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ownedStore(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integration } = await supabaseAdmin
      .from("supplier_integrations")
      .select("margin_percent,status")
      .eq("store_id", data.storeId)
      .eq("provider", "cj")
      .maybeSingle();
    if (!integration || integration.status !== "active")
      throw new Error("A integração CJ não está ativa.");
    const { syncCjCatalog } = await import("@/lib/suppliers.server");
    const catalog = await syncCjCatalog(
      supabaseAdmin,
      data.storeId,
      Number(integration.margin_percent)
    );
    return catalog;
  });

export const processSupplierFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ fulfillmentId: z.string().uuid(), storeId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await ownedStore(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fulfillment } = await supabaseAdmin
      .from("supplier_fulfillments")
      .select("id,store_id,provider")
      .eq("id", data.fulfillmentId)
      .eq("store_id", data.storeId)
      .maybeSingle();
    if (!fulfillment) throw new Error("Envio não encontrado.");
    if (fulfillment.provider !== "cj")
      throw new Error("O Dropi aguarda a liberação do acesso de parceiro.");
    const { submitCjFulfillment } = await import("@/lib/suppliers.server");
    await submitCjFulfillment(supabaseAdmin, fulfillment.id);
    return { ok: true };
  });

export function extractCjProductId(input: string): string | null {
  const clean = input.trim();
  const uuidMatch = clean.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  );
  if (uuidMatch) return uuidMatch[0];

  const pidParam = clean.match(/[?&]pid=([a-zA-Z0-9_-]+)/);
  if (pidParam) return pidParam[1];

  const slugMatch = clean.match(/-p-([a-zA-Z0-9_-]+)(?:\.html)?/);
  if (slugMatch) return slugMatch[1];

  if (/^[a-zA-Z0-9_-]{8,45}$/.test(clean)) return clean;

  return null;
}

export const importCjProductByUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        storeId: z.string().uuid(),
        productUrlOrId: z.string().min(5),
        customMarginPercent: z.number().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .eq("owner_id", context.userId)
      .maybeSingle();

    if (!store) throw new Error("Loja de vendedor não encontrada.");

    const pid = extractCjProductId(data.productUrlOrId);
    if (!pid) {
      throw new Error("Link da CJ Dropshipping inválido. Cole a URL completa do produto ou o PID.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCjAccessToken, getUsdBrlRate, categoryFor } = await import("@/lib/suppliers.server");

    const token = await getCjAccessToken(supabaseAdmin, data.storeId);
    const exchange = await getUsdBrlRate(supabaseAdmin, data.storeId);

    const cjRes = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${encodeURIComponent(pid)}`,
      {
        headers: {
          "CJ-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    const cjJson = await cjRes.json();
    if (!cjJson.result || !cjJson.data) {
      throw new Error(`CJ Dropshipping: ${cjJson.message || "Produto não encontrado."}`);
    }

    const product = cjJson.data;
    const { mapCjEconomicalDetails } = await import("@/lib/cj-content");
    const variant = product.variants?.[0];
    const vid = variant?.vid;
    if (!vid) throw new Error("A CJ não retornou uma variante válida.");
    const title = (product.productNameEn || product.productName || "Produto CJ Dropshipping").trim();
    const costUsd = Number(variant?.variantSellPrice ?? product.sellPrice ?? 0);

    if (costUsd <= 0) throw new Error("Preço de custo do produto inválido na CJ.");

    // Import keeps an item-only base; destination-specific landed pricing is quoted separately.
    const { calculateFinalPrice } = await import("@/lib/pricing");
    const finalPrice = calculateFinalPrice(Math.round(costUsd * exchange.rate * 100) / 100);
    const compareAtPrice = null;

    const images: string[] = [
      variant?.variantImage,
      product.bigImage,
      product.productImage,
      ...(product.productImageSet || []),
    ].filter((img): img is string => typeof img === "string" && img.startsWith("https://"));

    const uniqueImages = [...new Set(images)];

    const productPayload = {
      store_id: data.storeId,
      title: title.slice(0, 160),
      supplier_title_original: title.slice(0, 160),
      supplier_locale: "en",
      ...mapCjEconomicalDetails(product),
      supplier_details_original: product,
      supplier_details_synced_at: new Date().toISOString(),
      price: finalPrice,
      compare_at_price: compareAtPrice,
      free_shipping: false,
      stock: 0,
      category: categoryFor(`${product.categoryName || ""} ${title}`),
      image_url: uniqueImages[0] ?? null,
      gallery_urls: uniqueImages.slice(0, 10),
      product_type: "physical",
      is_active: true,
      supplier: "cj",
      supplier_product_id: product.pid,
      supplier_variant_id: vid,
      supplier_sku: variant?.variantSku || null,
      supplier_cost: costUsd,
      supplier_cost_currency: "USD",
      supplier_exchange_rate: exchange.rate,
      supplier_exchange_rate_at: exchange.quotedAt,
      supplier_last_synced_at: new Date().toISOString(),
    };

    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id,title,supplier_locale")
      .eq("store_id", data.storeId)
      .eq("supplier", "cj")
      .eq("supplier_variant_id", vid)
      .maybeSingle();

    if (existing?.id) {
      if (existing.supplier_locale === "pt-BR") {
        productPayload.title = existing.title;
        productPayload.supplier_locale = "pt-BR";
      }
      const { error: updateError } = await supabaseAdmin.from("products").update(productPayload).eq("id", existing.id);
      if (updateError) throw updateError;
      const { persistCjVariantProducts } = await import("./cj-variant-products.server");
      await persistCjVariantProducts(supabaseAdmin, existing.id, product);
      return { success: true, updated: true, productId: existing.id, title, price: finalPrice };
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();

    if (insertErr) throw insertErr;
    const { persistCjVariantProducts } = await import("./cj-variant-products.server");
    await persistCjVariantProducts(supabaseAdmin, inserted.id, product);

    return { success: true, updated: false, productId: inserted.id, title, price: finalPrice };
  });

export const setCjAutoImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await ownedStore(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("supplier_integrations").update({ auto_sync: data.enabled })
      .eq("store_id", data.storeId).eq("provider", "cj");
    if (error) throw error;
    return { enabled: data.enabled };
  });
