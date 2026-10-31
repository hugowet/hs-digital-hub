// Pedidos não pagos expiram para o lojista após 72 horas: somem das abas
// "Pedidos e Envios" e "Vendas e extrato" (regra de negócio HS Digital).
export const UNPAID_ORDER_VISIBILITY_MS = 72 * 60 * 60 * 1000;

const PAID_PAYMENT_STATUSES = new Set(["paid", "approved"]);
const PAID_ORDER_STATUSES = new Set(["paid", "processing", "shipped", "in_transit", "delivered"]);

export function isOrderVisibleToSeller(
  order: { payment_status?: string | null; status?: string | null; created_at?: string | null },
  now = Date.now(),
) {
  if (PAID_PAYMENT_STATUSES.has(order.payment_status ?? "")) return true;
  if (PAID_ORDER_STATUSES.has(order.status ?? "")) return true;
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;
  return now - createdAt < UNPAID_ORDER_VISIBILITY_MS;
}
