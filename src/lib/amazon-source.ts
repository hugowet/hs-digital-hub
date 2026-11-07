import { validateAmazonProductUrl } from "./amazon-link-batch";

/** Retain the submitted link separately from the selected product and affiliate link. */
export function amazonSourceMetadata(rawUrl: string, verifiedAsin?: string) {
  const original = validateAmazonProductUrl(rawUrl);
  const input = new URL(original);
  const inputAsin = input.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase();
  const asin = verifiedAsin?.toUpperCase() ?? inputAsin;
  if (asin && !/^[A-Z0-9]{10}$/.test(asin) || inputAsin && asin !== inputAsin) {
    throw new Error("O link não corresponde ao produto lido na Amazon.");
  }
  const productUrl = asin ? `https://www.amazon.com.br/dp/${asin}` : original;
  const affiliate = new URL(productUrl);
  affiliate.searchParams.set("tag", "hsdigitalst0c-20");
  return {
    affiliate_original_url: original,
    affiliate_product_url: productUrl,
    affiliate_url: affiliate.toString(),
    ...(asin ? { asin } : {}),
  };
}

/** Existing products remain readable through their legacy affiliate link. */
export function amazonSourceUrl(specifications: Record<string, unknown> | null | undefined) {
  for (const key of ["affiliate_product_url", "affiliate_original_url", "affiliate_url"]) {
    const value = specifications?.[key];
    if (typeof value !== "string") continue;
    try {
      const source = amazonSourceMetadata(value);
      if (source.asin) return source.affiliate_product_url;
    } catch { /* Do not fetch untrusted supplier targets. */ }
  }
  return "";
}