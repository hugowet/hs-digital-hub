type ShippingOption = {
  serviceCode: string;
  serviceName: string;
  amount: number;
  deliveryDaysMax: number | null;
  providerPayload: Record<string, any>;
};

/** Keep one included service and one optional upgrade, using confirmed costs only. */
export function cjShippingModalities<T extends ShippingOption>(options: T[]): T[] {
  const ordered = [...options].sort((a, b) =>
    Number(a.providerPayload.supplier_freight_brl) - Number(b.providerPayload.supplier_freight_brl)
    || a.serviceCode.localeCompare(b.serviceCode));
  const express = ordered[0];
  if (!express) return [];
  const premium = ordered.slice(1).filter((option) => option.deliveryDaysMax !== null
    && (express.deliveryDaysMax === null || option.deliveryDaysMax < express.deliveryDaysMax))
    .sort((a, b) => Number(a.providerPayload.supplier_freight_brl) - Number(b.providerPayload.supplier_freight_brl))[0]
    ?? ordered[1];
  const baseItems = express.providerPayload.priced_items ?? [];
  const baseTotal = baseItems.reduce((sum: number, item: any) => sum + Number(item.unit_price) * item.quantity, express.amount);
  const result = [{ ...express, serviceName: "⚡ Envio Prioritário Express",
    providerPayload: { ...express.providerPayload, modality: "express" } }];
  if (premium) {
    const premiumTotal = (premium.providerPayload.priced_items ?? []).reduce(
      (sum: number, item: any) => sum + Number(item.unit_price) * item.quantity, premium.amount);
    result.push({ ...premium, serviceName: "🚀 Envio Prioritário Premium",
      amount: Math.round((express.amount + Math.max(0, premiumTotal - baseTotal)) * 100) / 100,
      providerPayload: { ...premium.providerPayload, modality: "premium", priced_items: baseItems,
        embedded_free_shipping: express.providerPayload.embedded_free_shipping } });
  }
  return result as T[];
}

export function includeFirstPurchaseMargin<T extends ShippingOption>(options: T[], eligible: boolean): T[] {
  if (!eligible) return options;
  return options.map((option) => {
    if (!option.providerPayload.embedded_free_shipping) return option;
    const items = [...(option.providerPayload.priced_items ?? [])];
    const first = items[0];
    if (!first) return option;
    items[0] = { ...first, unit_price: Number((Number(first.unit_price) + 10 / first.quantity).toFixed(2)) };
    // Persist the exact rounded addition, so the ledger and customer total agree.
    const margin = Number(((items[0].unit_price - first.unit_price) * first.quantity).toFixed(2));
    return { ...option, providerPayload: { ...option.providerPayload, priced_items: items,
      first_purchase_margin_included: margin } };
  });
}