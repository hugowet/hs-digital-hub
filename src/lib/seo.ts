import type { Product } from "@/lib/catalog";

export const SITE_ORIGIN = "https://hs-digital-marck.lovable.app";

export function plainDescription(value: string | null | undefined, fallback: string) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 170) || fallback;
}

export function productSearchSchema(product: Product) {
  const url = `${SITE_ORIGIN}/produto/${product.id}`;
  // CJ's public price is an item-only starting price, not a destination-confirmed offer.
  // Do not advertise it as a final purchasable Google offer or fabricate reviews.
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: plainDescription(product.description_long || product.description, `Confira ${product.title} na HS Digital.`),
    sku: product.id,
    url,
    ...(product.image_url?.startsWith("https://") ? { image: [product.image_url] } : {}),
    ...(product.supplier !== "cj" && Number(product.price) > 0 ? {
      offers: {
        "@type": "Offer", url, priceCurrency: "BRL", price: Number(product.price).toFixed(2),
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    } : {}),
  };
}