import { queryOptions } from "@tanstack/react-query";
import type { Product } from "@/lib/catalog";
import { fetchCatalogPage } from "@/lib/catalog.functions";

export const FEATURED_SHIRT_ID = "57d9fb51-cc36-42bb-8b1c-9a183d14bca9";

export function selectAmazonBestSellers(products: Product[], featured: Product[]) {
  const unique = new Map([...featured, ...products].map((product) => [product.id, product]));
  return [...unique.values()]
    .filter((product) => product.supplier === "amazon" && Number(product.stock) > 0)
    .sort((a, b) => {
      if (a.id === FEATURED_SHIRT_ID) return -1;
      if (b.id === FEATURED_SHIRT_ID) return 1;
      return Number(b.sold_count || 0) - Number(a.sold_count || 0);
    });
}

export const amazonBestSellersOptions = queryOptions({
  queryKey: ["amazon-best-sellers"],
  queryFn: async () => {
    const [ranked, shirt] = await Promise.all([
      fetchCatalogPage({ data: { supplier: "amazon", page: 0, pageSize: 48, sort: "popular" } }),
      fetchCatalogPage({ data: { supplier: "amazon", query: "procura no gugo", page: 0, pageSize: 12 } }),
    ]);
    return selectAmazonBestSellers(ranked.products, shirt.products.filter((product) => product.id === FEATURED_SHIRT_ID));
  },
  staleTime: 60_000,
});