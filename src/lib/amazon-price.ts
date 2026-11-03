import { parseHTML } from "linkedom";
import { calculateAmazonPrice } from "./pricing";

/** Exact selected BRL offer; never JSON estimates, installments, coupons or list prices. */
export function extractExactAmazonPrice(html: string, expectedAsin?: string): number | null {
  const { document } = parseHTML(html);
  const boxes = Array.from(document.querySelectorAll('#corePriceDisplay_desktop_feature_div, #corePrice_feature_div, #corePrice_mobile_feature_div'));
  // Current Amazon pages identify the selected offer on its price widget,
  // rather than always returning the old hidden ASIN input.
  const identities = [document.querySelector('input#ASIN')?.getAttribute('value'),
    ...boxes.map((box) => box.getAttribute('data-csa-c-asin'))]
    .filter((value): value is string => value !== null && value !== undefined)
    .map((value) => value.toUpperCase());
  const uniqueIdentities = [...new Set(identities)];
  const identity = uniqueIdentities[0];
  if (uniqueIdentities.length !== 1 || !identity || !/^[A-Z0-9]{10}$/.test(identity) || expectedAsin && identity !== expectedAsin.toUpperCase()) return null;

  const parseBrl = (text: string): number | null => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!/^R\$\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}$/.test(normalized)) return null;
    const value = Number(normalized.replace(/^R\$\s*/, '').replaceAll('.', '').replace(',', '.'));
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const values: number[] = [];
  for (const box of boxes) {
    for (const node of Array.from(box.querySelectorAll('.a-price:not(.a-text-price)'))) {
      const offscreen = node.querySelector('.a-offscreen')?.textContent?.trim() ?? '';
      // Some live offers leave a-offscreen empty and print BRL in three spans.
      const symbol = node.querySelector('.a-price-symbol')?.textContent ?? '';
      const whole = node.querySelector('.a-price-whole')?.textContent?.replace(/[,\s]/g, '') ?? '';
      const fraction = node.querySelector('.a-price-fraction')?.textContent?.trim() ?? '';
      const split = symbol.trim() === 'R$' && /^\d{2}$/.test(fraction) ? parseBrl(`R$ ${whole},${fraction}`) : null;
      const price = offscreen ? parseBrl(offscreen) : split;
      if (price === null || split !== null && split !== price) return null;
      values.push(price);
    }
  }
  const prices = [...new Set(values)];
  return prices.length === 1 ? prices[0] ?? null : null;
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