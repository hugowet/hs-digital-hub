import { parseHTML } from 'linkedom';

export type AmazonPageCandidate = { url: string; title: string; price: number; rating: number; reviews: number; badge: string; fulfilledByAmazon: boolean };

export function validateAmazonResultsUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || !['amazon.com.br', 'www.amazon.com.br'].includes(url.hostname) || url.username || url.password || url.port || url.pathname !== '/s') {
    throw new Error('Cole o link HTTPS de uma página de resultados da Amazon Brasil (/s).');
  }
  // Preserve search/category/price filters, never navigation or redirect targets.
  const clean = new URL('https://www.amazon.com.br/s');
  for (const key of ['k', 'rh', 'i', 's', 'page', 'node']) {
    const entry = url.searchParams.get(key);
    if (entry) clean.searchParams.set(key, entry);
  }
  return clean.toString();
}

export function extractAmazonPageCandidates(html: string): AmazonPageCandidate[] {
  const { document } = parseHTML(html);
  return Array.from(document.querySelectorAll('[data-component-type="s-search-result"][data-asin]')).slice(0, 60).flatMap((card) => {
    const asin = card.getAttribute('data-asin') ?? '';
    const title = card.querySelector('h2')?.textContent?.trim() ?? '';
    const prices = Array.from(card.querySelectorAll('.a-price:not(.a-text-price) .a-offscreen')).map((el) => {
      const text = el.textContent?.trim() ?? '';
      return /^R\$\s*[\d.]+,\d{2}$/.test(text) ? Number(text.replace(/R\$|\s|\./g, '').replace(',', '.')) : NaN;
    }).filter(Number.isFinite);
    const unique = [...new Set(prices)];
    if (!/^[A-Z0-9]{10}$/.test(asin) || !title || unique.length !== 1) return [];
    const rating = Number((card.querySelector('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt, .a-icon-star-mini .a-icon-alt')?.textContent ?? '').match(/\d[,.]\d/)?.[0]?.replace(',', '.')) || 0;
    const accessibleReviews = card.querySelector('a[aria-label*="classificações"], a[aria-label*="avaliações"]')?.getAttribute('aria-label')?.match(/^[\d.]+/)?.[0];
    const reviewText = accessibleReviews ?? card.querySelector('a[href*="customerReviews"] .a-size-base, a[href*="customerReviews"] span')?.textContent ?? '';
    const reviews = /^\s*[\d.]+\s*$/.test(reviewText) ? Number(reviewText.replace(/\D/g, '')) : 0;
    const text = card.textContent ?? '';
    const badge = text.match(/Escolha da Amazon|Mais vendido|Best seller/i)?.[0] ?? '';
    return [{ url: `https://www.amazon.com.br/dp/${asin}`, title, price: unique[0] ?? 0, rating, reviews, badge, fulfilledByAmazon: /enviado pela Amazon|envio pela Amazon/i.test(text) }];
  });
}

export function selectAmazonPageProducts(candidates: AmazonPageCandidate[]) {
  const seen = new Set<string>();
  const valid = candidates.filter((p) => {
    if (!p.title || !/^https:\/\/www\.amazon\.com\.br\/dp\/[A-Z0-9]{10}$/.test(p.url) || seen.has(p.url) || !Number.isFinite(p.price) || p.price < 15 || p.price > 5000 || p.rating < 4.3 || p.reviews < 100) return false;
    const trusted = (p.rating >= 4.5 && p.reviews >= 500) || (/escolha da amazon|mais vendido|best seller/i.test(p.badge) && p.reviews >= 100) || (p.fulfilledByAmazon && p.reviews >= 200) || p.reviews >= 1000;
    if (!trusted) return false;
    seen.add(p.url);
    return true;
  }).sort((a, b) => a.price - b.price || a.url.localeCompare(b.url));
  const cheap = valid.slice(0, 15).map((p) => ({ ...p, group: 'barato' as const }));
  const remaining = valid.slice(15);
  const count = Math.min(15, remaining.length);
  const start = Math.floor((remaining.length - count) / 2);
  const moderate = remaining.slice(start, start + count).map((p) => ({ ...p, group: 'intermediário' as const }));
  return { items: [...cheap, ...moderate], eligible: valid.length, cheap: cheap.length, moderate: moderate.length };
}