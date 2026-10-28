import { parseHTML } from "linkedom";
import { calculateAmazonPrice } from "./pricing";

/** Only the selected offer's buy box, never installments or recommendations. */
export function extractAmazonOfferPrice(html: string, asin: string): number | null {
  const { document } = parseHTML(html);
  const identity = document.querySelector('input#ASIN')?.getAttribute('value');
  if (!identity || identity.toUpperCase() !== asin.toUpperCase()) return null;
  const box = document.querySelector('#corePriceDisplay_desktop_feature_div') ?? document.querySelector('#corePrice_feature_div');
  const text = box?.querySelector('.a-price:not(.a-text-price) .a-offscreen')?.textContent ?? '';
  const match = text.match(/R\$\s*([\d.]+,\d{2})/);
  if (!match) return null;
  const cost = Number(match[1].replaceAll('.', '').replace(',', '.'));
  return Number.isFinite(cost) && cost >= 15 && cost <= 5000 ? cost : null;
}

export function amazonPricePatch(cost: number | null) {
  if (cost === null) return {};
  return { supplier_cost: cost, supplier_cost_currency: 'BRL', price: calculateAmazonPrice(cost), supplier_last_synced_at: new Date().toISOString() };
}