// Pedidos não pagos expiram para o lojista após 72 horas: somem das abas
// "Pedidos e Envios" e "Vendas e extrato" (regra de negócio HS Digital).
export const UNPAID_ORDER_VISIBILITY_MS = 72 * 60 * 60 * 1000;

export function isOrderVisibleToSeller(
  order: { payment_status?: string | null; created_at?: string | null },
  now = Date.now(),
) {
  if (order.payment_status === "paid") return true;
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;
  return now - createdAt < UNPAID_ORDER_VISIBILITY_MS;
}
