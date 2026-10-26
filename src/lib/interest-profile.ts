// Per-device interest profile: learns from searches, category clicks and
// product views, then re-ranks the unfiltered storefront so each person sees
// more of what they like. Stored locally (localStorage) — no account needed,
// nothing leaves the device.

const STORAGE_KEY = "hs-interest-profile";
const MAX_TERMS = 40;
const MAX_CATEGORIES = 20;
const DECAY = 0.92; // older signals weigh less each time a new one arrives

type InterestProfile = {
  categories: Record<string, number>;
  terms: Record<string, number>;
};

function read(): InterestProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { categories: {}, terms: {} };
    const parsed = JSON.parse(raw) as InterestProfile;
    return { categories: parsed.categories ?? {}, terms: parsed.terms ?? {} };
  } catch {
    return { categories: {}, terms: {} };
  }
}

function write(profile: InterestProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // storage full/blocked — personalization just stays off
  }
}

function bump(map: Record<string, number>, key: string, weight: number, cap: number) {
  for (const existing of Object.keys(map)) map[existing] *= DECAY;
  map[key] = (map[key] ?? 0) + weight;
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, cap);
  return Object.fromEntries(entries);
}

const STOP_WORDS = new Set(["de", "da", "do", "para", "com", "sem", "em", "e", "o", "a", "um", "uma"]);

function termsOf(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

export function recordSearch(query: string) {
  const profile = read();
  for (const term of termsOf(query).slice(0, 4)) {
    profile.terms = bump(profile.terms, term, 3, MAX_TERMS);
  }
  write(profile);
}

export function recordCategoryClick(slug: string) {
  if (!slug) return;
  const profile = read();
  profile.categories = bump(profile.categories, slug, 2, MAX_CATEGORIES);
  write(profile);
}

export function recordProductView(category: string | null | undefined, title: string) {
  const profile = read();
  if (category) profile.categories = bump(profile.categories, category, 1.5, MAX_CATEGORIES);
  for (const term of termsOf(title).slice(0, 5)) {
    profile.terms = bump(profile.terms, term, 1, MAX_TERMS);
  }
  write(profile);
}

export function hasInterestProfile(): boolean {
  const profile = read();
  return Object.keys(profile.categories).length > 0 || Object.keys(profile.terms).length > 0;
}

/** Higher = more interesting to this person. 0 when nothing matches. */
export function affinityScore(product: { category?: string | null; title?: string | null }): number {
  const profile = read();
  let score = 0;
  if (product.category && profile.categories[product.category]) {
    score += profile.categories[product.category] * 2;
  }
  if (product.title) {
    for (const term of termsOf(product.title)) {
      if (profile.terms[term]) score += profile.terms[term];
    }
  }
  return score;
}

/**
 * Re-ranks a storefront page list by affinity while keeping a healthy mix:
 * every 4th slot stays in the original daily-selection order so the page
 * never becomes a single-category echo chamber.
 */
export function personalizeProducts<T extends { category?: string | null; title?: string | null }>(
  products: T[],
): T[] {
  if (products.length < 4 || !hasInterestProfile()) return products;
  const scored = products.map((product, index) => ({ product, index, score: affinityScore(product) }));
  const liked = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  if (liked.length === 0) return products;
  const neutral = scored.filter((item) => item.score === 0);
  const result: T[] = [];
  let likedIndex = 0;
  let neutralIndex = 0;
  for (let slot = 0; slot < products.length; slot++) {
    const keepOriginal = slot % 4 === 3 && neutralIndex < neutral.length;
    if (keepOriginal || likedIndex >= liked.length) {
      result.push((neutralIndex < neutral.length ? neutral[neutralIndex++] : liked[likedIndex++]).product);
    } else {
      result.push(liked[likedIndex++].product);
    }
  }
  return result;
}
