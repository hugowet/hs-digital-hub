import { mapCjDetails } from "@/lib/cj-content";
import { cjRequest, getCjAccessToken, translateCjProductBatch } from "@/lib/suppliers.server";

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
    const { data: products, error } = await db.from("products").select("id,supplier_product_id")
      .eq("supplier", "cj").eq("store_id", storeId).is("supplier_details_synced_at", null).order("id").limit(10);
    if (error) throw error;
    if (products?.length) {
      const token = await getCjAccessToken(db, storeId);
      for (const product of products) {
        if (!product.supplier_product_id) throw new Error("Produto CJ sem identificador oficial; revisão necessária.");
        const details = await cjRequest<Record<string, unknown>>(`/product/query?pid=${encodeURIComponent(product.supplier_product_id)}`, token);
        const mapped = mapCjDetails(details);
        const values: Record<string, unknown> = {
          supplier_details_original: details,
          supplier_details_synced_at: new Date().toISOString(),
        };
        // Empty supplier fields must not destroy previously saved content.
        if (mapped.description_long) {
          values.description = mapped.description;
          values.description_long = mapped.description_long;
        }
        if (Object.keys(mapped.specifications).length) values.specifications = mapped.specifications;
        const { error: updateError } = await db.from("products").update(values).eq("id", product.id).eq("store_id", storeId);
        if (updateError) throw updateError;
        processed += 1;
        await save({ processed: job.processed + processed });
      }
    }
    const { count, error: countError } = await db.from("products").select("id", { count: "exact", head: true })
      .eq("supplier", "cj").eq("store_id", storeId).is("supplier_details_synced_at", null);
    if (countError) throw countError;
    await save({ status: count ? "pending" : "completed", lock_expires_at: null, lock_token: null, pause_reason: null });
    return { processed, remaining: count ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar o catálogo CJ.";
    await save({ status: "paused", pause_reason: message.slice(0, 1500), lock_expires_at: null, lock_token: null });
    return { processed, paused: true, error: message };
  }
}