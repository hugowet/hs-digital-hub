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
    const variant = product.variants?.[0];
    const vid = variant?.vid || product.pid;
    const title = (product.productNameEn || product.productName || "Produto CJ Dropshipping").trim();
    const costUsd = Number(variant?.variantSellPrice ?? product.sellPrice ?? 0);

    if (costUsd <= 0) throw new Error("Preço de custo do produto inválido na CJ.");

    // REGRA DE OURO 35% REAL: (Custo USD + $15.19 YunExpress) * Cotação BRL / 0.65
    const YUNEXPRESS_FREIGHT_USD = 15.19;
    const custoTotalUsd = costUsd + YUNEXPRESS_FREIGHT_USD;
    const custoTotalBrl = custoTotalUsd * exchange.rate;
    const finalPrice = Math.round((custoTotalBrl / 0.65) * 100) / 100;

    // Descontos dinâmicos e quebrados estilo Mercado Livre (19%, 28%, 35%, 63% OFF)
    const discountTags = [0.19, 0.28, 0.35, 0.42, 0.53, 0.63];
    const hashSeed = Math.abs(
      pid.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + Math.round(costUsd * 10)
    );
    const chosenDiscountRate = discountTags[hashSeed % discountTags.length];
    const compareAtPrice = Math.round((finalPrice / (1 - chosenDiscountRate)) * 100) / 100;

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
      description: product.description || `Produto importado da CJ Dropshipping (${title}).`,
      description_long:
        product.description || `Produto importado da CJ Dropshipping com estoque sincronizado.`,
      price: finalPrice,
      compare_at_price: compareAtPrice,
      free_shipping: true,
      stock: Number(variant?.variantKey || product.warehouseInventoryNum || 50),
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
      .select("id")
      .eq("store_id", data.storeId)
      .eq("supplier", "cj")
      .eq("supplier_product_id", product.pid)
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin.from("products").update(productPayload).eq("id", existing.id);
      return { success: true, updated: true, productId: existing.id, title, price: finalPrice };
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    return { success: true, updated: false, productId: inserted.id, title, price: finalPrice };
  });
