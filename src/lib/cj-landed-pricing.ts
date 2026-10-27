import { calculateFinalPrice, getMarginRate, lowTicketMargin } from "./pricing";
import { protectedCjPrice, protectedCjFlatPrice } from "./cj-profit";

export const FREE_SHIPPING_THRESHOLD = 89.9;

export function priceCjShipment(
  items: Array<{ productId: string; quantity: number; costUsd: number }>,
  freightUsd: number,
  exchangeRate: number,
  commissionRate = 0,
  firstPurchase = false,
) {
  if (!items.length || !Number.isFinite(freightUsd) || freightUsd < 0 ||
      !Number.isFinite(exchangeRate) || exchangeRate <= 0 ||
      items.some((item) => !Number.isFinite(item.costUsd) || item.costUsd <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new Error("Custo ou cotação CJ inválida.");
  }
  const costTotal = items.reduce((sum, item) => sum + item.costUsd * item.quantity, 0);
  const freightBrl = Math.round(freightUsd * exchangeRate * 100) / 100;
  let remainingCents = Math.round(freightBrl * 100);
  let firstPurchaseMarginTotal = 0;
  const pricedItems = items.map((item, index) => {
    const cents = index === items.length - 1 ? remainingCents : Math.round(freightBrl * 100 * item.costUsd * item.quantity / costTotal);
    remainingCents -= cents;
    const freightPerUnit = cents / 100 / item.quantity;
    const landedCost = Math.round((item.costUsd * exchangeRate + freightPerUnit) * 100) / 100;
    // Ticket baixo: margem fixa R$ 15 (1ª compra) / R$ 20 (demais); acima de R$ 100, tabela dinâmica.
    const flatMargin = lowTicketMargin(landedCost, firstPurchase);
    const landedPrice = flatMargin === null
      ? protectedCjPrice(landedCost, commissionRate, freightPerUnit)
      : protectedCjFlatPrice(landedCost, commissionRate, freightPerUnit, flatMargin);
    if (firstPurchase && flatMargin !== null) firstPurchaseMarginTotal += flatMargin * item.quantity;
    return { product_id: item.productId, quantity: item.quantity, landed_price: landedPrice, freight_per_unit: freightPerUnit,
      supplier_item_cost_brl: Math.ceil(item.costUsd * exchangeRate * 100) / 100,
      protected_net_target: Math.max(commissionRate > 0 ? landedCost * (1 + getMarginRate(landedCost)) : calculateFinalPrice(landedCost),landedCost+0.01) };
  });
  const landedTotal = Math.round(pricedItems.reduce((sum, item) => sum + item.landed_price * item.quantity, 0) * 100) / 100;
  const embedded = landedTotal >= FREE_SHIPPING_THRESHOLD;
  // Below the threshold freight is displayed separately, not added twice.
  const prices = pricedItems.map((item) => ({ ...item,
    unit_price: embedded ? item.landed_price : Number((item.landed_price - item.freight_per_unit).toFixed(2)),
    embedded_freight: embedded ? item.freight_per_unit : 0,
  }));
  return { items: prices, freightBrl, embedded, amount: embedded ? 0 : freightBrl, landedTotal,
    firstPurchaseMarginTotal: Math.round(firstPurchaseMarginTotal * 100) / 100 };
}

export function cjFreightUsd(option: Record<string, unknown>): number {
  const freight = Number(option.logisticPrice);
  if (!Number.isFinite(freight) || freight < 0) throw new Error("A CJ não confirmou o preço do frete.");
  if (option.totalPostageFee != null) {
    const total = Number(option.totalPostageFee);
    if (!Number.isFinite(total) || total < freight) throw new Error("Total de envio CJ inválido.");
    return total;
  }
  const extras = [option.taxesFee, option.clearanceOperationFee].map((value) => value == null ? 0 : Number(value));
  if (extras.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Taxas de envio CJ inválidas.");
  return freight + extras.reduce((sum, value) => sum + value, 0);
}