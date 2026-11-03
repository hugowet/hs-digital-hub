export const AMAZON_LINK_BATCH_LIMIT = 50;

export function validateAmazonProductUrl(value: string): string {
  const url = new URL(value.trim());
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
    !(host === "amzn.to" || host === "amzn.eu" || host === "amazon.com.br" || host.endsWith(".amazon.com.br"))) {
    throw new Error("Use um link HTTPS da Amazon Brasil ou amzn.to/amzn.eu.");
  }
  url.hash = "";
  return url.toString();
}

export function parseAmazonLinkBatch(input: string): string[] {
  const entries = input.trim().split(/\s+/).filter(Boolean);
  if (!entries.length) throw new Error("Cole pelo menos um link da Amazon.");
  if (entries.length > AMAZON_LINK_BATCH_LIMIT) throw new Error("Máximo de 50 links por lote.");
  const seen = new Set<string>();
  return entries.map(validateAmazonProductUrl).filter((url) => {
    const parsed = new URL(url);
    const asin = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase();
    const key = asin ?? `${parsed.hostname}${parsed.pathname}${parsed.search}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function shouldPauseAmazonBatch(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /CAPTCHA|Dogs|rodada interrompida|erro (401|402|403|429|503|504)|créditos|limite|Timeout|Failed to fetch/i.test(message);
}

/** One read at a time, no automatic publication or retries. */
export async function readAmazonLinkBatch<T>(options: {
  urls: string[];
  read: (url: string) => Promise<T>;
  result: (index: number, data: T | null, error: string | null) => void;
  cancelled: () => boolean;
  wait: () => Promise<void>;
}) {
  if (options.urls.length > AMAZON_LINK_BATCH_LIMIT) throw new Error("Máximo de 50 links por lote.");
  for (const [index, url] of options.urls.entries()) {
    if (options.cancelled()) return;
    try {
      const data = await options.read(url);
      options.result(index, data, null);
    } catch (error) {
      options.result(index, null, error instanceof Error ? error.message : "Não consegui ler este produto.");
      if (shouldPauseAmazonBatch(error)) return;
    }
    if (index < options.urls.length - 1 && !options.cancelled()) await options.wait();
  }
}