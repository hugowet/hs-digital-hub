// Montink print-on-demand fulfillment. Runs only after a confirmed approved payment; the
// UNIQUE(order_id, store_id, provider) row in supplier_fulfillments keeps it idempotent.
const MONTINK_URL = "https://api.montink.com/create_order";

export function montinkProductId(specifications: unknown): string | null {
  const id = (specifications as Record<string, unknown> | null)?.montink_product_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function buildMontinkPayload(order: any, items: any[]) {
  const a = order.shipping_address ?? {};
  return {
    external_id: order.id,
    customer: { name: a.name, cpf: a.cpf, phone: a.phone, email: a.email ?? null },
    address: {
      postal_code: a.postal_code, street: a.address, number: a.number,
      neighborhood: a.neighborhood, city: a.city, state: a.state, complement: a.note ?? "",
    },
    items: items.map((i) => ({ product_id: i.montinkId, variant: i.variant, quantity: i.quantity, title: i.title })),
  };
}

export async function dispatchPaidMontinkFulfillments(supabaseAdmin: any, orderId: string) {
  const token = process.env.MONTINK_API_TOKEN;
  const { data: order } = await supabaseAdmin.from("orders").select("id,payment_status,shipping_address").eq("id", orderId).maybeSingle();
  if (!order || order.payment_status !== "approved") return [];
  const { data: rows, error } = await supabaseAdmin.from("order_items")
    .select("store_id,title,quantity,supplier_variant_id_snapshot,products(supplier,specifications)").eq("order_id", orderId);
  if (error) throw error;
  const byStore = new Map<string, any[]>();
  for (const r of rows ?? []) {
    if (r.products?.supplier !== "montink") continue;
    const montinkId = montinkProductId(r.products.specifications);
    if (!montinkId) continue;
    const list = byStore.get(r.store_id) ?? [];
    list.push({ montinkId, variant: r.supplier_variant_id_snapshot, quantity: r.quantity, title: r.title });
    byStore.set(r.store_id, list);
  }
  const results = [];
  for (const [storeId, items] of byStore) {
    const payload = buildMontinkPayload(order, items);
    await supabaseAdmin.from("supplier_fulfillments").upsert(
      { order_id: orderId, store_id: storeId, provider: "montink", status: "pending", request_payload: payload },
      { onConflict: "order_id,store_id,provider", ignoreDuplicates: true });
    // Claim atomically so concurrent webhooks never send twice.
    const { data: claimed } = await supabaseAdmin.from("supplier_fulfillments")
      .update({ status: "processing" }).eq("order_id", orderId).eq("store_id", storeId).eq("provider", "montink")
      .in("status", ["pending", "retry"]).select("id,attempts").maybeSingle();
    if (!claimed) continue;
    try {
      if (!token) throw new Error("Token da Montink não configurado.");
      const res = await fetch(MONTINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Montink recusou o pedido (HTTP ${res.status}).`);
      await supabaseAdmin.from("supplier_fulfillments").update({
        status: "submitted", submitted_at: new Date().toISOString(), provider_payload: body,
        external_order_id: String(body?.id ?? body?.order_id ?? "") || null, attempts: claimed.attempts + 1, last_error: null,
      }).eq("id", claimed.id);
      results.push({ storeId, ok: true });
    } catch (e) {
      await supabaseAdmin.from("supplier_fulfillments").update({
        status: "retry", attempts: claimed.attempts + 1, last_error: e instanceof Error ? e.message : "Falha Montink",
        next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      }).eq("id", claimed.id);
      results.push({ storeId, ok: false });
    }
  }
  return results;
}
