import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reviewInput } from "./reviews";

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
    const url = process.env["SUPABASE_URL"] ?? "";
    if (!key || !url) throw new Error("Não foi possível carregar as avaliações.");
    const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    const result = await db.from("product_reviews").select("id,author,rating,comment,photo_paths,verified,created_at")
      .eq("product_id", data.productId).order("created_at", { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message);
    return Promise.all((result.data ?? []).map(async (row) => {
      const signed = row.photo_paths.length ? await db.storage.from("review-photos").createSignedUrls(row.photo_paths, 3600) : null;
      if (signed?.error) throw new Error("Não foi possível carregar as fotos das avaliações.");
      return { id: row.id, author: row.author, rating: row.rating, comment: row.comment, verified: row.verified,
        date: new Date(row.created_at).toLocaleDateString("pt-BR"), helpfulCount: 0,
        photos: (signed?.data ?? []).flatMap((photo) => photo.signedUrl ? [photo.signedUrl] : []) };
    }));
  });

export const publishProductReview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => reviewInput.parse(input))
  .handler(async ({ context, data }) => {
    const result = await context.supabase.rpc("publish_product_review", {
      _id: data.id, _product_id: data.productId, _author: data.author, _rating: data.rating,
      _comment: data.comment, _photo_paths: data.photoPaths,
    });
    if (result.error) throw new Error(result.error.message);
    return { id: result.data };
  });