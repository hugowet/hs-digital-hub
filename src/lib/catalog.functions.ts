import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import type { Product, ProductMedia } from "@/lib/catalog";
import { catalogSearchGroups } from "@/lib/catalog-search";
import { usesDailySelection } from "@/lib/storefront-selection";
import { isPurchasableVariant } from "./variant-availability";

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
  "id,title,supplier_title_original,description,description_long,price,compare_at_price,stock,category,image_url,gallery_urls,specifications,variations,free_shipping,rating,reviews_count,sold_count,store_id,product_type,supplier,supplier_product_id,supplier_variant_parent_id";
const cardProjection =
  "id,title,price,compare_at_price,stock,category,image_url,free_shipping,rating,reviews_count,sold_count,store_id,product_type,supplier";

async function prepareCards(rows: unknown[]): Promise<Product[]> {
  const products = rows.map((row) => ({
    ...(row as Product), description: null, description_long: null,
    gallery_urls: [], specifications: {}, variations: [], stores: null, media: [],
  }));
  const paths = [...new Set(products.flatMap((p) => p.image_url && isStoredMediaPath(p.image_url) ? [p.image_url] : []))];
  if (!paths.length) return products;
  // Only sign the public rows' cover paths; galleries are loaded on the product page.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).createSignedUrls(paths, 3600);
  if (error) throw error;
  const urls = new Map(paths.map((path, i) => [path, data?.[i]?.signedUrl]));
  return products.map((p) => ({ ...p, image_url: p.image_url ? urls.get(p.image_url) ?? p.image_url : null }));
}

const catalogInput = z.object({
  page: z.number().int().min(0).max(1_000).default(0),
  pageSize: z.number().int().min(12).max(100).default(60),
  query: z.string().trim().max(100).default(""),
  category: z.string().trim().max(80).nullable().default(null),
  supplier: z.enum(["cj", "amazon"]).nullable().default(null),
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
    const amazonPerPage = Math.max(1, Math.floor(input.pageSize / 3));
    const [{ data, error }, amazonResult] = await Promise.all([
      supabasePublic.from("products").select(cardProjection).eq("is_active", true).in("id", daily.ids),
      supabasePublic
        .from("products")
        .select(cardProjection)
        .eq("is_active", true)
        .eq("supplier", "amazon")
        .order("sold_count", { ascending: false })
        .order("rating", { ascending: false })
        .order("id", { ascending: true })
        .range(input.page * amazonPerPage, input.page * amazonPerPage + amazonPerPage - 1),
    ]);
    if (error) throw error;
    const byId = new Map(((data ?? []) as unknown as Product[]).map((product) => [product.id, product]));
    const base = daily.ids.flatMap((id) => {
      const product = byId.get(id);
      return product && product.supplier !== "amazon" ? [product] : [];
    });
    const amazon = amazonResult.error ? [] : ((amazonResult.data ?? []) as unknown as Product[]);
    // Mistura: a cada 3 posições, uma é da Amazon enquanto houver itens Amazon.
    const ordered: Product[] = [];
    let a = 0;
    for (const product of base) {
      if (ordered.length % 3 === 1 && a < amazon.length) ordered.push(amazon[a++]);
      ordered.push(product);
    }
    while (a < amazon.length) ordered.push(amazon[a++]);
    const products = await prepareCards(ordered);
    return { products, total: daily.total, nextPage: from + daily.ids.length < daily.total ? input.page + 1 : null };
  }

  // Text search runs in a SQL function that filters through the trigram index first, then sorts;
  // the plain REST query let the planner walk the popularity index and hit the statement timeout.
  const from = input.page * input.pageSize;
  const bounds: Record<string, [number | null, number | null]> = {
    a: [null, 50], b: [50, 100], c: [100, 200], d: [200, null],
  };
  const [min, max] = bounds[input.range] ?? [null, null];
  const { data: idRows, error: idError } = await supabasePublic.rpc("search_catalog_supplier_ids", {
    _groups: catalogSearchGroups(input.query),
    _category: input.category || null,
    _supplier: input.supplier,
    _min: min, _max: max,
    _free: Boolean(input.onlyFreeShipping),
    _sort: input.sort,
    _offset: from,
    _limit: input.pageSize + 1,
  } as never);
  if (idError) throw idError;
  const ids = ((idRows ?? []) as unknown as string[]).map((r) => (typeof r === "string" ? r : (r as { search_catalog_ids: string }).search_catalog_ids));
  const hasMore = ids.length > input.pageSize;
  const pageIds = ids.slice(0, input.pageSize);
  let rows: Product[] = [];
  if (pageIds.length) {
    const { data, error } = await supabasePublic.from("products").select(cardProjection).in("id", pageIds);
    if (error) throw error;
    const byId = new Map(((data ?? []) as unknown as Product[]).map((p) => [p.id, p]));
    rows = pageIds.flatMap((id) => { const product = byId.get(id); return product ? [product] : []; });
  }
  const products = await prepareCards(rows);
  const total = from + products.length + (hasMore ? 1 : 0);
  return { products, total, nextPage: hasMore ? input.page + 1 : null };
}

// A vitrine nunca quebra para o cliente: qualquer falha de banco/coluna
// retorna lista vazia e a tela mostra "Nenhum produto encontrado".
export const fetchCatalogPage = createServerFn({ method: "GET" })
  .inputValidator((input) => catalogInput.parse(input))
  .handler(async ({ data }) => {
    try {
      return await queryCatalog(data);
    } catch (err) {
      console.error("Falha ao carregar a vitrine:", err);
      return { products: [] as Product[], total: 0, nextPage: null };
    }
  });

export const fetchProducts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const result = await queryCatalog({
      page: 0,
      pageSize: 48,
      query: "",
      category: null,
      supplier: null,
      range: "all",
      sort: "popular",
      onlyFreeShipping: false,
    });
    return result.products;
  } catch (err) {
    console.error("Falha ao carregar produtos:", err);
    return [] as Product[];
  }
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
    if (!signed) return null;
    if (productRow.supplier === "cj" && productRow.supplier_product_id) {
      // Public, active, in-stock family variants only; no privileged read bypass.
      const { data: options, error: optionsError } = await supabasePublic.from("products")
        .select("id,supplier_variant_label,stock").eq("store_id", productRow.store_id)
        .eq("is_active", true).gt("stock", 0)
        .eq("supplier", "cj").or(`id.eq.${productRow.supplier_variant_parent_id ?? productRow.id},supplier_variant_parent_id.eq.${productRow.supplier_variant_parent_id ?? productRow.id}`)
        .order("supplier_variant_label");
      if (optionsError) throw optionsError;
      return { ...signed, supplierOptions: (options ?? []).filter(isPurchasableVariant).flatMap((option) => option.supplier_variant_label
        ? [{ productId: option.id, label: option.supplier_variant_label, stock: option.stock }] : []) };
    }
    return signed;
  });
