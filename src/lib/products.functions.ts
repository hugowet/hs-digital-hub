import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const mediaSchema = z.object({
  storagePath: z.string().min(5).max(500),
  mediaType: z.enum(["image", "video"]),
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
  position: z.number().int().min(0).max(9),
});

const categories = [
  "digitais-templates",
  "cursos-infoprodutos",
  "eletronicos-gadgets",
  "celulares-tv",
  "perifericos-acessorios",
  "ferramentas",
  "autos-motos",
  "casa-setup",
  "eletronicos",
  "moda",
  "casa",
  "beleza",
  "games",
  "esportes",
  "infantil",
  "mercado",
] as const;

const productSchema = z.object({
  title: z.string().trim().min(2, "Título deve ter no mínimo 2 caracteres").max(160),
  description: z.string().trim().max(5_000).default(""),
  price: z.number().positive("Preço deve ser maior que zero").max(99_999_999.99),
  stock: z.number().int().min(0, "Estoque deve ser positivo").max(1_000_000),
  category: z.enum(categories),
  productType: z.enum(["physical", "digital"]),
  deliveryUrl: z.string().max(2_000).default(""),
  media: z.array(mediaSchema).max(10),
  weightKg: z.number().positive().max(1_000).nullable().optional(),
  heightCm: z.number().positive().max(1_000).nullable().optional(),
  widthCm: z.number().positive().max(1_000).nullable().optional(),
  lengthCm: z.number().positive().max(1_000).nullable().optional(),
}).superRefine((data, context) => {
  if (data.productType === "digital" && (!data.deliveryUrl || !data.deliveryUrl.startsWith("https://"))) {
    context.addIssue({ 
      code: z.ZodIssueCode.custom, 
      path: ["deliveryUrl"], 
      message: "Informe um link HTTPS de entrega válido." 
    });
  }
  if (data.productType === "physical") {
    if (!data.weightKg || !data.heightCm || !data.widthCm || !data.lengthCm) {
      context.addIssue({ 
        code: z.ZodIssueCode.custom, 
        path: ["weightKg"], 
        message: "Informe peso e dimensões do produto físico para o frete." 
      });
    }
  }
});

export const createSellerProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: productId, error } = await context.supabase.rpc("create_seller_product_v3", {
      _title: data.title,
      _description: data.description,
      _price: data.price,
      _stock: data.stock,
      _category: data.category,
      _product_type: data.productType,
      _delivery_url: data.deliveryUrl,
      _media: data.media,
      _weight_kg: data.weightKg ?? 0,
      _height_cm: data.heightCm ?? 0,
      _width_cm: data.widthCm ?? 0,
      _length_cm: data.lengthCm ?? 0,
    });
    if (error || !productId) throw new Error(error?.message ?? "Não foi possível cadastrar o produto.");
    return { productId };
  });
