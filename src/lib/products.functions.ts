import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { manualOptionsSchema } from "./manual-product-options";
import { sellerEditSchema, mergeEditedOptions } from "./seller-product-edit";

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

const productSchema = z
  .object({
    title: z.string().trim().min(2, "Título deve ter no mínimo 2 caracteres").max(160),
    description: z.string().trim().max(5_000).default(""),
    price: z.number().positive("Preço deve ser maior que zero").max(99_999_999.99),
    compareAtPrice: z.number().positive().nullable().default(null),
    supplierCost: z.number().min(0).nullable().default(null),
    stock: z.number().int().min(0, "Estoque deve ser positivo").max(1_000_000),
    category: z.enum(categories, {
      errorMap: () => ({ message: "Selecione uma categoria válida" }),
    }),
    productType: z.enum(["physical", "digital"]),
    deliveryUrl: z.string().max(2_000).default(""),
    media: z.array(mediaSchema).max(10).default([]),
    weightKg: z.number().positive().max(1_000).nullable().optional(),
    heightCm: z.number().positive().max(1_000).nullable().optional(),
    widthCm: z.number().positive().max(1_000).nullable().optional(),
    lengthCm: z.number().positive().max(1_000).nullable().optional(),
    shippingOrigin: z.enum(["national", "international"]),
    variations: manualOptionsSchema.default([]),
  })
  .superRefine((data, context) => {
    if (data.compareAtPrice !== null && data.compareAtPrice <= data.price) context.addIssue({ code: z.ZodIssueCode.custom, path: ["compareAtPrice"], message: "O preço anterior deve ser maior que o preço de venda." });
    if (data.productType === "digital") {
      if (!data.deliveryUrl || !data.deliveryUrl.startsWith("https://")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deliveryUrl"],
          message: "Informe um link HTTPS de entrega válido.",
        });
      }
    }
    if (data.productType === "physical") {
      if (
        data.weightKg == null ||
        data.weightKg <= 0 ||
        data.heightCm == null ||
        data.heightCm <= 0 ||
        data.widthCm == null ||
        data.widthCm <= 0 ||
        data.lengthCm == null ||
        data.lengthCm <= 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weightKg"],
          message: "Informe peso e dimensões válidos (maiores que zero) para o frete.",
        });
      }
    }
  });

export const createSellerProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: productId, error } = await context.supabase.rpc("create_seller_product_v5" as never, {
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
      _shipping_origin: data.shippingOrigin,
      _variations: data.variations,
      _compare_at_price: data.compareAtPrice,
      _supplier_cost: data.supplierCost,
    } as never);

    if (error || !productId) {
      throw new Error(error?.message ?? "Não foi possível cadastrar o produto.");
    }

    return { productId };
  });

export const updateSellerProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sellerEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!categories.includes(data.category as typeof categories[number])) throw new Error("Selecione uma categoria válida.");
    const { data: product, error: readError } = await context.supabase.from("products")
      .select("id,store_id,variations,supplier").eq("id", data.productId).single();
    if (readError || !product) throw new Error("Produto não encontrado.");
    const { data: store } = await context.supabase.from("stores").select("id")
      .eq("id", product.store_id).eq("owner_id", context.userId).eq("status", "approved").maybeSingle();
    if (!store) throw new Error("Você só pode editar produtos da sua própria loja aprovada.");
    const variations = data.variations === null ? null : mergeEditedOptions(
      Array.isArray(product.variations) ? product.variations as never : [], data.variations, Boolean(product.supplier),
    );
    const { error } = await context.supabase.rpc("update_seller_product_priced" as never, {
      _product_id: data.productId, _fields: data, _variations: variations, _media: data.media,
    } as never);
    if (error) throw new Error(error.message);
    return { productId: data.productId };
  });
