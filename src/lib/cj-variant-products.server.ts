import { cjVariantOptions } from "./cj-variants";
import { calculateFinalPrice } from "./pricing";

/** Each option is a real product ID so quote, stock reservation and order use the existing atomic path. */
export async function persistCjVariantProducts(db: any, parentId: string, details: Record<string, unknown>) {
  const { data: parent, error } = await db.from("products").select("*").eq("id", parentId).single();
  if (error) throw error;
  if (!parent || parent.supplier_variant_parent_id) return;
  const variants = cjVariantOptions(details);
  if (Array.isArray(details.variants) && variants.length) {
    const { data: children, error: childrenError } = await db.from("products").select("id,supplier_variant_id")
      .eq("supplier_variant_parent_id", parentId);
    if (childrenError) throw childrenError;
    const official = new Set(variants.map((v) => v.id));
    const removed = (children ?? []).filter((v: any) => !official.has(v.supplier_variant_id)).map((v: any) => v.id);
    if (removed.length) {
      const retired = await db.from("products").update({ is_active: false, stock: 0 }).in("id", removed);
      if (retired.error) throw retired.error;
    }
  }
  for (const variant of variants) {
    const { data: existing, error: lookupError } = await db.from("products").select("id")
      .eq("store_id", parent.store_id).eq("supplier", "cj").eq("supplier_variant_id", variant.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (variant.id === parent.supplier_variant_id) {
      const { error: saveError } = await db.from("products").update({ supplier_variant_label: variant.label }).eq("id", parentId);
      if (saveError) throw saveError;
      continue;
    }
    const values = {
      store_id: parent.store_id, title: parent.title, supplier_title_original: parent.supplier_title_original,
      supplier_locale: parent.supplier_locale, description: parent.description, description_long: parent.description_long,
      specifications: parent.specifications, gallery_urls: parent.gallery_urls, variations: parent.variations,
      category: parent.category, product_type: "physical", supplier: "cj", supplier_product_id: parent.supplier_product_id,
      supplier_variant_id: variant.id, supplier_variant_label: variant.label, supplier_variant_parent_id: parentId,
      supplier_sku: variant.sku, supplier_cost: variant.costUsd, supplier_cost_currency: "USD",
      supplier_exchange_rate: parent.supplier_exchange_rate, supplier_exchange_rate_at: parent.supplier_exchange_rate_at,
      supplier_details_original: details, supplier_details_synced_at: parent.supplier_details_synced_at, supplier_content_version: 1,
      image_url: variant.image ?? parent.image_url,
    };
    const result = existing
      ? await db.from("products").update(values).eq("id", existing.id)
      : await db.from("products").insert({ ...values, is_active: false, stock: 0, free_shipping: false,
          price: calculateFinalPrice(variant.costUsd * Number(parent.supplier_exchange_rate)) });
    if (result.error) throw result.error;
  }
}