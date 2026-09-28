import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import type { Product, ProductMedia } from "@/lib/catalog";

const MEDIA_BUCKET = "product-images";

function isStoredMediaPath(value: string) {
  return !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("/");
}

async function signProductMedia(product: Product, supabaseAdmin: any): Promise<Product> {
  const { data: mediaRows, error } = await supabaseAdmin
    .from("product_media")
    .select("id,storage_path,media_type,mime_type,position")
    .eq("product_id", product.id)
    .order("position");
  if (error) throw error;

  const rows = (mediaRows ?? []) as Array<Omit<ProductMedia, "url">>;
  if (rows.length > 0) {
    const paths = rows.map((item) => item.storage_path);
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(paths, 60 * 60);
    if (signError) throw signError;
    const media = rows.map((item, index) => ({ ...item, url: signed?.[index]?.signedUrl ?? "" }));
    return {
      ...product,
      image_url: media.find((item) => item.media_type === "image")?.url ?? media[0]?.url ?? null,
      gallery_urls: media.map((item) => item.url).filter(Boolean),
      media,
    };
  }

  const legacy = [product.image_url, ...(product.gallery_urls ?? [])]
    .filter((value): value is string => Boolean(value));
  const storedPaths = [...new Set(legacy.filter(isStoredMediaPath))];
  if (storedPaths.length === 0) return { ...product, media: [] };

  const { data: signed } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(storedPaths, 60 * 60);
  const signedByPath = new Map(storedPaths.map((path, index) => [path, signed?.[index]?.signedUrl ?? path]));
  return {
    ...product,
    image_url: product.image_url && isStoredMediaPath(product.image_url)
      ? signedByPath.get(product.image_url) ?? product.image_url
      : product.image_url,
    gallery_urls: (product.gallery_urls ?? []).map((url) => isStoredMediaPath(url) ? signedByPath.get(url) ?? url : url),
    media: [],
  };
}

const projection = "id,title,description,description_long,price,compare_at_price,stock,category,image_url,gallery_urls,specifications,variations,free_shipping,rating,reviews_count,sold_count,store_id,product_type,stores(name,slug)";

export const fetchProducts = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await supabasePublic
    .from("products")
    .select(projection)
    .eq("is_active", true)
    .order("sold_count", { ascending: false });
  if (error) throw error;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(((data ?? []) as unknown as Product[]).map((product) => signProductMedia(product, supabaseAdmin)));
});

export const fetchProduct = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: product, error } = await supabasePublic
      .from("products")
      .select(projection)
      .eq("id", data.productId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!product) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return signProductMedia(product as unknown as Product, supabaseAdmin);
  });