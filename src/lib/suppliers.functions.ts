import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Extrai o PID tanto de links da CJ quanto de IDs diretos
export function extractCjProductId(input: string): string | null {
  const clean = input.trim();
  // 1. Formato UUID (ex: 000B9312-456A-4D31-94BD-B083E2A198E8)
  const uuidMatch = clean.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (uuidMatch) return uuidMatch[0];

  // 2. Parâmetro de busca ?pid=...
  const pidParam = clean.match(/[?&]pid=([a-zA-Z0-9_-]+)/);
  if (pidParam) return pidParam[1];

  // 3. Slug de URL da CJ: ...-p-1563728192019283748.html
  const slugMatch = clean.match(/-p-([a-zA-Z0-9_-]+)(?:\.html)?/);
  if (slugMatch) return slugMatch[1];

  // 4. Se o usuário colou direto o ID numérico ou alfanumérico
  if (/^[a-zA-Z0-9_-]{8,45}$/.test(clean)) return clean;

  return null;
}

export const importCjProductByUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      storeId: z.string().uuid(),
      productUrlOrId: z.string().min(5),
      customMarginPercent: z.number().optional(), // Permite margem avulsa ou usa a padrão da loja
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    // Valida permissão do vendedor sobre a loja
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
    const { getCjAccessToken, getBrlExchangeRate, categoryFor } = await import("@/lib/suppliers.server");

    // Obtém margem configurada da loja se não foi passada uma específica
    let marginPercent = data.customMarginPercent;
    if (marginPercent === undefined) {
      const { data: integ } = await supabaseAdmin
        .from("supplier_integrations")
        .select("margin_percent")
        .eq("store_id", data.storeId)
        .eq("provider", "cj")
        .maybeSingle();
      marginPercent = Number(integ?.margin_percent ?? 30); // Padrão 30% caso não configurado
    }

    const token = await getCjAccessToken(supabaseAdmin, data.storeId);
    const exchange = await getBrlExchangeRate();

    // Consulta os detalhes oficiais do produto na API 2.0 da CJ Dropshipping [1, 4]
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

    // Cálculo automático: Custo USD -> Câmbio BRL -> Aplicação da Margem de Lucro
    const finalPrice = Math.round(costUsd * exchange.rate * (1 + marginPercent / 100) * 100) / 100;

    // Coleta todas as fotos da galeria e imagem principal
    const images: string[] = [
      variant?.variantImage,
      product.bigImage,
      product.productImage,
      ...(product.productImageSet || []),
    ].filter((img): img is string => typeof img === "string" && img.startsWith("https://"));

    const uniqueImages = [...new Set(images)];

    // Salva ou atualiza o produto no catálogo da sua loja
    const productPayload = {
      store_id: data.storeId,
      title: title.slice(0, 160),
      supplier_title_original: title.slice(0, 160),
      supplier_locale: "en",
      description: product.description || `Produto importado da CJ Dropshipping (${title}).`,
      description_long: product.description || `Produto importado da CJ Dropshipping com estoque sincronizado.`,
      price: finalPrice,
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
