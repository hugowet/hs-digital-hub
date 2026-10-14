import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import type { Product, ProductMedia } from "@/lib/catalog";

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
}

// Alinhado com as colunas reais da sua tabela "produtos" no Supabase
const projection = "id,titulo,descricao,preco,image_url,supplier,supplier_sku,tipo,link_entrega";

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
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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

  // CORREÇÃO: Apontando diretamente para a tabela real "produtos" em produção
  let query = supabasePublic.from("produtos").select(projection, { count: "exact" });

  if (input.query) query = query.ilike("titulo", `%${input.query.replace(/[%_,]/g, " ")}%`);
  if (input.category) query = query.eq("tipo", input.category);
  if (input.range === "a") query = query.lte("preco", 50);
  if (input.range === "b") query = query.gte("preco", 50).lte("preco", 100);
  if (input.range === "c") query = query.gte("preco", 100).lte("preco", 200);
  if (input.range === "d") query = query.gte("preco", 200);

  if (input.sort === "price-asc") {
    query = query.order("preco", { ascending: true });
  } else if (input.sort === "price-desc") {
    query = query.order("preco", { ascending: false });
  } else {
    query = query.order("id", { ascending: true });
  }

  const from = input.page * input.pageSize;
  const { data, error, count } = await query.range(from, from + input.pageSize - 1);
  if (error) throw error;

  // Mapeia as colunas em português para o formato que a interface espera ler
  const mappedProducts = (data ?? []).map((item: any) => ({
    id: item.id,
    title: item.titulo,
    description: item.descricao,
    description_long: item.descricao,
    price: Number(item.preco),
    compare_at_price: Number(item.preco) * 1.35, // Puxa sua margem de 35% automática
    stock: 99,
    category: item.tipo || "Geral",
    image_url: item.image_url,
    gallery_urls: [item.image_url],
    free_shipping: true,
    rating: 5,
    reviews_count: 12,
    sold_count: 45,
    supplier: item.supplier,
  })) as unknown as Product[];

  const products = await signProductBatch(mappedProducts);
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

    // CORREÇÃO: Puxando o produto individual direto da tabela correta "produtos"
    const { data: productRow, error } = await supabasePublic
      .from("produtos")
      .select(projection)
      .eq("id", data.productId)
      .maybeSingle();

    if (error) throw error;
    if (!productRow) return null;

    const mappedSingle = {
      id: productRow.id,
      title: productRow.titulo,
      description: productRow.descricao,
      description_long: productRow.descricao,
      price: Number(productRow.preco),
      compare_at_price: Number(productRow.preco) * 1.35,
      stock: 99,
      category: productRow.tipo || "Geral",
      image_url: productRow.image_url,
      gallery_urls: [productRow.image_url],
      free_shipping: true,
      rating: 5,
      reviews_count: 12,
      sold_count: 45,
      supplier: productRow.supplier,
    } as unknown as Product;

    const [signed] = await signProductBatch([mappedSingle]);
    return signed ?? null;
  });
