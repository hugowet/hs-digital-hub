export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export const compact = (value: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value || 0);

/**
 * Split de pagamento: comissão da HS Digital + repasse ao vendedor.
 * Usado no checkout e pronto para enviar ao Mercado Pago / Asaas.
 */
export function splitPayment(total: number, commissionRate: number) {
  const platformFee = Math.round(total * commissionRate * 100) / 100;
  return { total, platformFee, sellerAmount: Math.round((total - platformFee) * 100) / 100 };
}
