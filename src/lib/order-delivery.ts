export const deliverySteps = [
  ["confirmed", "Pedido confirmado"], ["preparing", "Em separação"],
  ["packed", "Embalado"], ["shipped", "Despachado"],
  ["arrived_in_city", "Chegou à cidade"], ["out_for_delivery", "Saiu para entrega"],
  ["delivered", "Entregue"],
] as const;

export function currentDeliveryStep(events: Array<{ status: string; created_at?: string }>, paid: boolean) {
  const latest = [...events].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")).at(-1);
  return deliverySteps.findIndex(([status]) => status === (latest?.status ?? (paid ? "confirmed" : "")));
}

export function bufferedDeliveryDate(supplierDate: string | null | undefined) {
  if (!supplierDate || !/^\d{4}-\d{2}-\d{2}$/.test(supplierDate)) return null;
  const date = new Date(`${supplierDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== supplierDate) return null;
  date.setUTCDate(date.getUTCDate() + 2);
  return date.toISOString().slice(0, 10);
}

// Presentation only: order access remains protected by store ownership and RLS.
export function showsManualPurchaseReport(email: string | null | undefined) {
  return email?.trim().toLowerCase() === "hugohug12ou@gmail.com";
}

export function deliveryFields(address: Record<string, unknown> = {}) {
  const value = (...keys: string[]) => keys.map(k => address[k]).find(v => typeof v === "string" && v.trim()) as string | undefined;
  return {
    name: value("name", "recipient_name") ?? "Não informado",
    cpf: value("cpf") ?? "Não informado",
    phone: value("phone") ?? "Não informado",
    street: value("address", "street_address") ?? "Não informado",
    number: value("number", "street_number") ?? "Não informado",
    neighborhood: value("neighborhood", "district") ?? "Não informado",
    city: value("city") ?? "Não informado", state: value("state") ?? "Não informado",
    zip: value("postal_code", "postalCode") ?? "Não informado",
    note: value("note", "complement") ?? "Não informado",
  };
}

export function deliveryReport(order: { id: string; shipping_address?: Record<string, unknown>; order_items: Array<{ title: string; quantity: number }> }) {
  const a = deliveryFields(order.shipping_address);
  return [`Pedido: ${order.id}`, ...order.order_items.map(i => `Produto: ${i.quantity}x ${i.title}`),
    `Nome completo: ${a.name}`, `CPF: ${a.cpf}`, `Telefone: ${a.phone}`, `Rua: ${a.street}`,
    `Número: ${a.number}`, `Bairro: ${a.neighborhood}`, `Complemento: ${a.note}`,
    `Cidade: ${a.city}`, `UF: ${a.state}`, `CEP: ${a.zip}`].join("\n");
}

export function assertTrackableOrder(order: { payment_status: string; order_items: Array<{ store_id: string }> } | null, storeId: string) {
  if (!order || !order.order_items.some(i => i.store_id === storeId)) throw new Error("Pedido não pertence à loja.");
  if (!["paid", "approved"].includes(order.payment_status)) throw new Error("Aguarde o pagamento aprovado.");
}