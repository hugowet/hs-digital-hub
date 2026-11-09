// Montink print-on-demand fulfillment. Runs only after a confirmed approved payment; the
// UNIQUE(order_id, store_id, provider) row in supplier_fulfillments keeps it idempotent.
const MONTINK_URL = "https://api.montink.com/create_order";

export function montinkProductId(specifications: unknown): string | null {
  const id = (specifications as Record<string, unknown> | null)?.montink_product_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function buildMontinkPayload(order: any, items: any[]) {
  const a = order.shipping_address ?? {};
  if (!a.email || !a.cpf || !a.number || !a.neighborhood || !order.shippingId) throw new Error("Pedido Montink sem dados ou transportadora confirmados.");
  return { external_order_id: order.id, customer_name: a.name, customer_email: a.email, customer_document: a.cpf, customer_phone: a.phone, value_total: items.reduce((n, i) => n + i.price * i.quantity, 0), shipping_id: Number(order.shippingId), address: { zipcode: a.postal_code, street: a.address, number: a.number, neighborhood: a.neighborhood, city: a.city, state: a.state, complement: a.note ?? "" }, products: items.map(i => {
    const choice = Object.fromEntries((String(i.title).split(" — ").at(-1) ?? "").split(" · ").map((part: string) => part.split(": ")));
    if (!choice.Cor) throw new Error("Cor Montink não confirmada no pedido.");
    return { product_id: Number(i.montinkId), quantity: i.quantity, price: i.price, var1: choice.Tamanho ?? "ÚNICO", var2: choice.Cor };
  }) };
}

export async function dispatchPaidMontinkFulfillments(supabaseAdmin: any, orderId: string) {
  const token = process.env.MONTINK_API_TOKEN;
  const { data: order } = await supabaseAdmin.from("orders").select("id,buyer_id,payment_status,shipping_address").eq("id", orderId).maybeSingle();
  if (!order || order.payment_status !== "approved") return [];
  const { data: rows, error } = await supabaseAdmin.from("order_items")
    .select("store_id,title,quantity,unit_price,supplier_variant_id_snapshot,products(supplier,specifications)").eq("order_id", orderId);
  if (error) throw error;
  const byStore = new Map<string, any[]>();
  for (const r of rows ?? []) {
    if (r.products?.supplier !== "montink") continue;
    const montinkId = montinkProductId(r.products.specifications);
    if (!montinkId) continue;
    const list = byStore.get(r.store_id) ?? [];
    list.push({ montinkId, variant: r.supplier_variant_id_snapshot, quantity: r.quantity, title: r.title, price: Number(r.unit_price) });
    byStore.set(r.store_id, list);
  }
  const results = [];
  for (const [storeId, items] of byStore) {
    const { data: shipment } = await supabaseAdmin.from("order_shipments").select("service_code").eq("order_id", orderId).eq("store_id", storeId).maybeSingle();
    if (!shipment?.service_code?.startsWith("montink_")) continue;
    const { data: buyer } = await supabaseAdmin.auth.admin.getUserById(order.buyer_id);
    let payload;
    try { payload = buildMontinkPayload({ ...order, shipping_address: { ...order.shipping_address, email: buyer?.user?.email }, shippingId: shipment.service_code.slice(8) }, items); } catch { continue; }
    await supabaseAdmin.from("supplier_fulfillments").upsert(
      { order_id: orderId, store_id: storeId, provider: "montink", status: "pending", request_payload: payload },
      { onConflict: "order_id,store_id,provider", ignoreDuplicates: true });
    // Claim atomically so concurrent webhooks never send twice.
    const { data: claimed } = await supabaseAdmin.from("supplier_fulfillments")
      .update({ status: "processing" }).eq("order_id", orderId).eq("store_id", storeId).eq("provider", "montink")
      .eq("status", "pending").select("id,attempts").maybeSingle();
    if (!claimed) continue;
    try {
      if (!token) throw new Error("Token da Montink não configurado.");
      const res = await fetch(MONTINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorizationtoken: token },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success !== true) throw new Error(`Montink recusou o pedido (HTTP ${res.status}).`);
      await supabaseAdmin.from("supplier_fulfillments").update({
        status: "submitted", submitted_at: new Date().toISOString(), provider_payload: body,
        external_order_id: String(body?.id ?? body?.order_id ?? "") || null, attempts: claimed.attempts + 1, last_error: null,
      }).eq("id", claimed.id);
      results.push({ storeId, ok: true });
    } catch (e) {
      await supabaseAdmin.from("supplier_fulfillments").update({
        status: "processing", attempts: claimed.attempts + 1, last_error: e instanceof Error ? e.message : "Falha Montink",
        next_attempt_at: null,
      }).eq("id", claimed.id);
      results.push({ storeId, ok: false });
    }
  }
  return results;
}
