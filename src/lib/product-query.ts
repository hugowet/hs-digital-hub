import { queryOptions } from "@tanstack/react-query";
import { fetchProduct } from "@/lib/catalog.functions";

export const productQueryOptions = (productId: string) => queryOptions({
  queryKey: ["product", productId],
  queryFn: () => fetchProduct({ data: { productId } }),
  staleTime: 5 * 60_000,
});