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
  const url = productPageUrl(product.id, product.title);
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
        item: productPageUrl(product.id, product.title),
      },
    ],
  };
}

const UUID_TAIL = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Friendly URL text from a product title: lowercase ASCII words joined by hyphens. */
export function slugify(title: string | null | undefined) {
  return (title ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Unique product URL segment: "nome-do-produto-<id>"; the id suffix keeps it unique. */
export function productSlugParam(id: string, title?: string | null) {
  const slug = slugify(title);
  return slug ? `${slug}-${id}` : id;
}

/** Reads the product id back out of a friendly or legacy UUID-only segment. */
export function productIdFromParam(param: string) {
  return UUID_TAIL.exec(param)?.[1]?.toLowerCase() ?? param;
}

export function productPageUrl(id: string, title?: string | null) {
  return `${SITE_ORIGIN}/produto/${productSlugParam(id, title)}`;
}
