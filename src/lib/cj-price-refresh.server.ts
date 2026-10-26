import { protectedCjPrice } from "./cj-profit";
import { cjRequest, getCjAccessToken, getUsdBrlRate } from "./suppliers.server";
import { cjConfirmedVariantStock, cjVariantOptions } from "./cj-variants";

export async function refreshCjPrices(db: any, storeId: string) {
  const { data: claims, error: claimError } = await db.rpc("claim_cj_price_refresh", { _store_id: storeId });
  if (claimError) throw claimError;
  const claim = claims?.[0];
  if (!claim) return { busy: true };
  const release = (values: Record<string, unknown>) => db.from("supplier_price_refresh_jobs").update({
    ...values, lease_until: null, updated_at: new Date().toISOString(),
  }).eq("store_id", storeId).eq("lease_token", claim.lease_token);
  let cursor = claim.cursor_id;
  let processed = 0;
  try {
    let query = db.from("products").select("id,supplier_variant_id")
      .eq("store_id", storeId).eq("supplier", "cj").not("supplier_variant_id", "is", null).order("id").limit(10);
    if (cursor) query = query.gt("id", cursor);
    const { data: rows, error } = await query;
    if (error) throw error;
    const token = await getCjAccessToken(db, storeId);
    const exchange = await getUsdBrlRate(db, storeId);
    const { data: platform, error: platformError } = await db.from("platform_settings").select("commission_rate").eq("id", true).single();
    if (platformError || !platform) throw new Error("Comissão da plataforma não confirmada.");
    for (const row of rows ?? []) {
      let variant: any;
      try {
        variant = await cjRequest<any>(`/product/variant/queryByVid?vid=${encodeURIComponent(row.supplier_variant_id)}`, token);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "";
        // Supplier removed this variant: stop selling it and move on instead of blocking the queue.
        if (!/removed from shelves|not exist|not found|offline/i.test(message)) throw caught;
        const { error: offError } = await db.from("products").update({
          stock: 0, is_active: false, supplier_last_synced_at: new Date().toISOString(),
        }).eq("id", row.id);
        if (offError) throw offError;
        cursor = row.id; processed += 1;
        continue;
      }
      const cost = Number(variant?.variantSellPrice);
      if (!Number.isFinite(cost) || cost <= 0 || variant?.vid !== row.supplier_variant_id) throw new Error("Custo CJ inválido.");
      const stock = cjConfirmedVariantStock(await cjRequest<unknown>(`/product/stock/queryByVid?vid=${encodeURIComponent(row.supplier_variant_id)}`, token));
      const option = cjVariantOptions({ variants: [variant] })[0];
      const { error: saveError } = await db.from("products").update({
        stock, is_active: stock > 0,
        ...(option ? { supplier_variant_label: option.label, supplier_sku: option.sku } : {}),
        supplier_cost: cost, supplier_exchange_rate: exchange.rate, supplier_exchange_rate_at: exchange.quotedAt,
        price: protectedCjPrice(Math.ceil(cost * exchange.rate * 100) / 100, Number(platform.commission_rate)),
        supplier_last_synced_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (saveError) throw saveError;
      cursor = row.id; processed += 1;
    }
    await release({ cursor_id: rows?.length === 10 ? cursor : null,
      next_attempt_at: new Date(Date.now() + (rows?.length === 10 ? 0 : 6 * 60 * 60_000)).toISOString(), last_error: null });
    return { processed };
  } catch (caught) {
    await release({ cursor_id: cursor, next_attempt_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      last_error: (caught instanceof Error ? caught.message : "Falha CJ").slice(0, 1000) });
    throw caught;
  }
}