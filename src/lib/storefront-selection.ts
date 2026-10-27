/** Boa Vista uses UTC-4 without daylight saving time. */
export function storefrontDay(now = new Date()) {
  return new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function usesDailySelection(input: {
  query: string;
  category: string | null;
  range: string;
  sort: string;
  onlyFreeShipping: boolean;
  supplier?: string | null;
}) {
  return !input.supplier && !input.query && !input.category && input.range === "all" && input.sort === "popular" && !input.onlyFreeShipping;
}