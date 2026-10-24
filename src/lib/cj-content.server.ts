import { mapCjEconomicalDetails, localizeCjTechnicalText } from "@/lib/cj-content";
import { cjRequest, getCjAccessToken, translateCjProductBatch } from "@/lib/suppliers.server";
import { persistCjVariantProducts } from "@/lib/cj-variant-products.server";

export async function processCjContentJob(db: any, storeId: string, operation: "titles" | "details") {
  const now = new Date();
  const lockToken = crypto.randomUUID();
  const { data: job, error: claimError } = await db.from("supplier_content_jobs")
    .update({ status: "running", lock_expires_at: new Date(now.getTime() + 15 * 60_000).toISOString(), lock_token: lockToken })
    .eq("store_id", storeId).eq("operation", operation).in("status", ["pending", "running"])
    .or(`lock_expires_at.is.null,lock_expires_at.lt.${now.toISOString()}`).select("id,processed").maybeSingle();
  if (claimError) throw claimError;
  if (!job) return { processed: 0, busy: true };
  let processed = 0;
  const save = async (values: Record<string, unknown>) => {
    const { error } = await db.from("supplier_content_jobs").update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", job.id).eq("lock_token", lockToken);
    if (error) throw error;
  };
  try {
    if (operation === "titles") {
      const result = await translateCjProductBatch(db, 50, undefined, storeId);
      processed = result.translated;
      await save({ processed: job.processed + processed, status: result.remaining ? "pending" : "completed", lock_expires_at: null, lock_token: null, pause_reason: null });
      return { processed, remaining: result.remaining };
    }
    const { data: products, error } = await db.from("products").select("id,supplier_product_id,supplier_details_original,description,description_long,specifications")
      .eq("supplier", "cj").eq("store_id", storeId).is("supplier_variant_parent_id", null)
      .lt("supplier_content_version", 1).order("id").limit(50);
    if (error) throw error;
    if (products?.length) {
      let token: string | undefined;
      for (const product of products) {
        // Yield with durable progress instead of overrunning a single HTTP request.
        if (Date.now() - now.getTime() > 45_000) break;
        if (!product.supplier_product_id) throw new Error("Produto CJ sem identificador oficial; revisão necessária.");
        const cached = product.supplier_details_original;
        if (!cached) token ??= await getCjAccessToken(db, storeId);
        const details = cached ?? await cjRequest<Record<string, unknown>>(`/product/query?pid=${encodeURIComponent(product.supplier_product_id)}`, token ?? "");
        const t = mapCjEconomicalDetails(details);
        // Never replace an already translated saved description with English supplier prose.
        const savedDescription = product.description_long || product.description;
        if (cached && savedDescription) {
          t.description = localizeCjTechnicalText(savedDescription);
          t.description_long = t.description;
        }
        if (cached && product.specifications && Object.keys(product.specifications).length) {
          t.specifications = Object.fromEntries(Object.entries(product.specifications).map(([label, value]) =>
            [localizeCjTechnicalText(label), localizeCjTechnicalText(String(value))]));
        }
        const values: Record<string, unknown> = {
          supplier_details_original: details,
          supplier_details_synced_at: new Date().toISOString(),
        };
        // Empty supplier fields must not destroy previously saved content.
        if (t.description) {
          values.description = t.description;
          values.description_long = t.description;
        }
        if (Object.keys(t.specifications).length) values.specifications = t.specifications;
        const { error: updateError } = await db.from("products").update(values).eq("id", product.id).eq("store_id", storeId);
        if (updateError) throw updateError;
        await persistCjVariantProducts(db, product.id, details);
        const { error: versionError } = await db.from("products").update({ supplier_content_version: 1 }).eq("id", product.id);
        if (versionError) throw versionError;
        processed += 1;
        await save({ processed: job.processed + processed });
      }
    }
    const { count, error: countError } = await db.from("products").select("id", { count: "exact", head: true })
      .eq("supplier", "cj").eq("store_id", storeId).is("supplier_variant_parent_id", null).lt("supplier_content_version", 1);
    if (countError) throw countError;
    await save({ status: count ? "pending" : "completed", lock_expires_at: null, lock_token: null, pause_reason: null });
    return { processed, remaining: count ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar o catálogo CJ.";
    await save({ processed: job.processed + processed, status: "paused", pause_reason: message.slice(0, 1500), lock_expires_at: null, lock_token: null });
    return { processed, paused: true, error: message };
  }
}