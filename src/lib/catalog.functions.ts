import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import type { Product, ProductMedia } from "@/lib/catalog";
import { catalogSearchGroups } from "@/lib/catalog-search";
import { usesDailySelection } from "@/lib/storefront-selection";

const MEDIA_BUCKET = "product-images";

function isStoredMediaPath(value: string) {
  return !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("/");
}

async function signProductBatch(products: Product[]) {
  const storedProducts = products.filter((product) => {
    const urls = [product.image_url, ...(product.gallery_urls ?? [])].filter((value): value is string =>
      Boolean(value),
    );
    return urls.some(isStoredMediaPath);
  });
  if (storedProducts.length === 0) return products.map((product) => ({ ...product, media: [] }));

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = storedProducts.map((product) => product.id);
    const { data: mediaRows, error } = await supabaseAdmin
      .from("product_media")
      .select("id,product_id,storage_path,media_type,mime_type,position")
      .in("product_id", ids)
      .order("position");
    if (error) throw error;

    const rows = (mediaRows ?? []) as Array<ProductMedia & { product_id: string }>;
    const paths = rows.map((item) => item.storage_path);
    const { data: signed } = await supabaseAdmin.storage.from(MEDIA_BUCKET).createSignedUrls(paths, 60 * 60);
    const signedByPath = new Map(paths.map((path, index) => [path, signed?.[index]?.signedUrl ?? path]));

    return products.map((product) => {
      const productMedia = rows.filter((item) => item.product_id === product.id);
      if (productMedia.length > 0) {
        const media = productMedia.map(({ product_id: _productId, ...item }) => ({
          ...item,
          url: signedByPath.get(item.storage_path) ?? item.storage_path,
        })) as ProductMedia[];
        return {
          ...product,
          image_url: media.find((item) => item.media_type === "image")?.url ?? media[0]?.url ?? null,
          gallery_urls: media.map((item) => item.url),
          media,
        };
      }
      const signLegacy = (value: string) => (isStoredMediaPath(value) ? (signedByPath.get(value) ?? value) : value);
      return {
        ...product,
        image_url: product.image_url ? signLegacy(product.image_url) : null,
        gallery_urls: (product.gallery_urls ?? []).map(signLegacy),
        media: [],
      };
    });
  } catch (err) {
    console.warn("Aviso ao assinar mídias de produtos:", err);
    return products.map((product) => ({ ...product, media: [] }));
  }
}

const projection =
  "id,title,supplier_title_original,description,description_long,price,compare_at_price,stock,category,image_url,gallery_urls,specifications,variations,free_shipping,rating,reviews_count,sold_count,store_id,product_type,supplier";

const catalogInput = z.object({
  page: z.number().int().min(0).max(1_000).default(0),
  pageSize: z.number().int().min(12).max(100).default(60),
  query: z.string().trim().max(100).default(""),
  category: z.string().trim().max(80).nullable().default(null),
  range: z.enum(["all", "a", "b", "c", "d"]).default("all"),
  sort: z.enum(["popular", "price-asc", "price-desc"]).default("popular"),
  onlyFreeShipping: z.boolean().default(false),
});

type CatalogInput = z.infer<typeof catalogInput>;

async function createPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  const url = process.env.SUPABASE_URL ?? "";

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

async function queryCatalog(input: CatalogInput) {
  const supabasePublic = await createPublicClient();

  if (usesDailySelection(input)) {
    const from = input.page * input.pageSize;
    const { data: selection, error: selectionError } = await supabasePublic.rpc("daily_storefront_selection", {
      p_offset: from,
      p_limit: input.pageSize,
    });
    if (selectionError) throw selectionError;
    const daily = z.object({ ids: z.array(z.string().uuid()), total: z.number(), day: z.string() }).parse(selection);
    if (daily.ids.length === 0) return { products: [] as Product[], total: daily.total, nextPage: null };
    const { data, error } = await supabasePublic.from("products").select(projection).eq("is_active", true).in("id", daily.ids);
    if (error) throw error;
    const byId = new Map(((data ?? []) as unknown as Product[]).map((product) => [product.id, product]));
    const ordered = daily.ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
    });
    const products = await signProductBatch(ordered);
    return { products, total: daily.total, nextPage: from + daily.ids.length < daily.total ? input.page + 1 : null };
  }

  let query = supabasePublic.from("products").select(projection, { count: "exact" }).eq("is_active", true);

  for (const terms of catalogSearchGroups(input.query)) {
    query = query.or(terms.map((term) => `catalog_search_text.ilike.%${term}%`).join(","));
  }
  if (input.category) query = query.eq("category", input.category);
  if (input.range === "a") query = query.lte("price", 50);
  if (input.range === "b") query = query.gte("price", 50).lte("price", 100);
  if (input.range === "c") query = query.gte("price", 100).lte("price", 200);
  if (input.range === "d") query = query.gte("price", 200);
  if (input.onlyFreeShipping) query = query.or("free_shipping.eq.true,price.gte.79");

  if (input.sort === "price-asc") {
    query = query.order("price", { ascending: true });
  } else if (input.sort === "price-desc") {
    query = query.order("price", { ascending: false });
  } else {
    query = query.order("sold_count", { ascending: false }).order("id", { ascending: true });
  }

  const from = input.page * input.pageSize;
  const { data, error, count } = await query.range(from, from + input.pageSize - 1);
  if (error) throw error;

  const rawProducts = (data ?? []) as unknown as Product[];
  const products = await signProductBatch(rawProducts);
  const total = count ?? products.length;
  return { products, total, nextPage: from + products.length < total ? input.page + 1 : null };
}

export const fetchCatalogPage = createServerFn({ method: "GET" })
  .inputValidator((input) => catalogInput.parse(input))
  .handler(async ({ data }) => queryCatalog(data));

export const fetchProducts = createServerFn({ method: "GET" }).handler(async () => {
  const result = await queryCatalog({
    page: 0,
    pageSize: 48,
    query: "",
    category: null,
    range: "all",
    sort: "popular",
    onlyFreeShipping: false,
  });
  return result.products;
});

export const fetchProduct = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabasePublic = await createPublicClient();

    const { data: productRow, error } = await supabasePublic
      .from("products")
      .select(projection)
      .eq("id", data.productId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!productRow) return null;

    const [signed] = await signProductBatch([productRow as unknown as Product]);
    return signed ?? null;
  });
