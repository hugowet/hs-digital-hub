import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const mediaSchema = z.object({
  storagePath: z.string().min(10).max(500),
  mediaType: z.enum(["image", "video"]),
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
  position: z.number().int().min(0).max(9),
});

const categories = [
  "digitais-templates", "cursos-infoprodutos", "eletronicos-gadgets",
  "perifericos-acessorios", "casa-setup", "eletronicos", "moda", "casa",
  "beleza", "games", "esportes", "infantil", "mercado",
] as const;

const productSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5_000),
  price: z.number().positive().max(99_999_999.99),
  stock: z.number().int().min(0).max(1_000_000),
  category: z.enum(categories),
  productType: z.enum(["physical", "digital"]),
  deliveryUrl: z.string().url().max(2_000).or(z.literal("")),
  media: z.array(mediaSchema).max(10),
}).superRefine((data, context) => {
  if (data.productType === "digital" && !data.deliveryUrl.startsWith("https://")) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryUrl"], message: "Informe um link HTTPS de entrega válido." });
  }
  data.media.forEach((item, index) => {
    const valid = item.mediaType === "image"
      ? item.mimeType.startsWith("image/") && item.sizeBytes <= 10 * 1024 * 1024
      : item.mimeType.startsWith("video/") && item.sizeBytes <= 50 * 1024 * 1024;
    if (!valid) context.addIssue({ code: z.ZodIssueCode.custom, path: ["media", index], message: "Mídia inválida." });
  });
  if (data.media.length > 0 && !data.media.some((item) => item.mediaType === "image")) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["media"], message: "Inclua ao menos uma foto para usar como capa." });
  }
});

export const createSellerProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: productId, error } = await context.supabase.rpc("create_seller_product_v2", {
      _title: data.title,
      _description: data.description,
      _price: data.price,
      _stock: data.stock,
      _category: data.category,
      _product_type: data.productType,
      _delivery_url: data.deliveryUrl,
      _media: data.media,
    });
    if (error || !productId) throw new Error(error?.message ?? "Não foi possível cadastrar o produto.");
    return { productId };
  });