import { parseHTML } from "linkedom";
import { calculateAmazonPrice } from "./pricing";

/** Exact selected BRL offer; never JSON estimates, installments, coupons or list prices. */
export function extractExactAmazonPrice(html: string, expectedAsin?: string): number | null {
  const { document } = parseHTML(html);
  const identity = document.querySelector('input#ASIN')?.getAttribute('value');
  if (!identity || !/^[A-Z0-9]{10}$/i.test(identity) || expectedAsin && identity.toUpperCase() !== expectedAsin.toUpperCase()) return null;
  for (const selector of ['#corePriceDisplay_desktop_feature_div', '#corePrice_feature_div', '#corePrice_mobile_feature_div']) {
    const box = document.querySelector(selector);
    if (!box) continue;
    const values = Array.from(box.querySelectorAll('.a-price:not(.a-text-price) .a-offscreen'))
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter((text) => /^R\$\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}$/.test(text))
      .map((text) => Number(text.replace(/^R\$\s*/, '').replaceAll('.', '').replace(',', '.')));
    const prices = [...new Set(values)];
    if (prices.length !== 1) return null;
    const cost = prices[0];
    return cost !== undefined && Number.isFinite(cost) && cost > 0 ? cost : null;
  }
  return null;
}

/** Existing automatic stock/price refresh retains its trust price range. */
export function extractAmazonOfferPrice(html: string, asin: string): number | null {
  const cost = extractExactAmazonPrice(html, asin);
  if (cost === null) return null;
  return Number.isFinite(cost) && cost >= 15 && cost <= 5000 ? cost : null;
}

export function amazonPricePatch(cost: number | null) {
  if (cost === null) return {};
  return { supplier_cost: cost, supplier_cost_currency: 'BRL', price: calculateAmazonPrice(cost), supplier_last_synced_at: new Date().toISOString() };
}