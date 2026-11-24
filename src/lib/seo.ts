import type { Product } from "@/lib/catalog";

export const SITE_ORIGIN = "https://hsdigitalmarketpla.store";

export function plainDescription(value: string | null | undefined, fallback: string) {
  return (
    (value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 170) || fallback
  );
}

export function productShareUrl(productId: string) {
  return `${SITE_ORIGIN}/api/public/product-share/${encodeURIComponent(productId)}`;
}

function productBrand(product: Product) {
  const specifications = product.specifications;
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) return undefined;
  const entry = Object.entries(specifications).find(([key]) => {
    const normalized = key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    return normalized === "marca" || normalized === "brand";
  });
  const name = typeof entry?.[1] === "string" ? entry[1].trim().slice(0, 120) : "";
  return name ? { "@type": "Brand", name } : undefined;
}

export function productSearchSchema(product: Product) {
  const url = `${SITE_ORIGIN}/produto/${product.id}`;
  const brand = productBrand(product);
  // CJ's public price is an item-only starting price, not a destination-confirmed offer.
  // Do not advertise it as a final purchasable Google offer or fabricate reviews.
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: plainDescription(product.description_long || product.description, `Confira ${product.title} na HS Digital.`),
    sku: product.id,
    url,
    mainEntityOfPage: url,
    ...(product.category ? { category: product.category } : {}),
    ...(brand ? { brand } : {}),
    // This stable public rendition does not expire like private signed gallery URLs.
    ...(product.image_url ? { image: [productShareUrl(product.id)] } : {}),
    ...(product.supplier !== "cj" && Number(product.price) > 0
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "BRL",
            price: Number(product.price).toFixed(2),
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };
}

export function productBreadcrumbSchema(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_ORIGIN}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: product.title,
        item: `${SITE_ORIGIN}/produto/${product.id}`,
      },
    ],
  };
}
