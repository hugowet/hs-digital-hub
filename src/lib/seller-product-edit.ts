import { z } from "zod";
import { manualOptionsSchema } from "./manual-product-options";

export const sellerEditSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().max(100_000),
  descriptionLong: z.string().max(200_000),
  price: z.number().positive().max(99_999_999.99),
  compareAtPrice: z.number().positive().nullable().default(null),
  supplierCost: z.number().min(0).nullable(),
  stock: z.number().int().min(0).max(1_000_000),
  category: z.string().min(1).max(80),
  shippingOrigin: z.enum(["national", "international"]),
  weightKg: z.number().positive().max(1000).nullable(),
  heightCm: z.number().positive().max(1000).nullable(),
  widthCm: z.number().positive().max(1000).nullable(),
  lengthCm: z.number().positive().max(1000).nullable(),
  variations: manualOptionsSchema.nullable(),
  media: z.array(z.object({
    storagePath: z.string().min(5).max(500).optional(),
    url: z.string().url().max(2000).refine(v => v.startsWith("https://") && !v.includes("/storage/v1/object/sign/" )).optional(),
    mediaType: z.enum(["image", "video"]).default("image"),
    mimeType: z.string().max(120).optional(),
    sizeBytes: z.number().int().positive().max(50 * 1024 * 1024).optional(),
  }).refine(v => Boolean(v.storagePath) !== Boolean(v.url))).min(1).max(10).nullable(),
}).refine(v => v.compareAtPrice === null || v.compareAtPrice > v.price, "O preço anterior deve ser maior que o preço de venda.");

type Group = { name: string; options: string[]; [key: string]: unknown };
export function mergeEditedOptions(original: Group[], edited: Group[], imported: boolean): Group[] {
  const editable = new Set(["Cor", "Tamanho", "Tamanho (US)"]);
  return [
    ...original.filter(g => !editable.has(g.name)),
    ...edited.map(g => {
      const previous = original.find(old => old.name === g.name);
      const changed = !previous || JSON.stringify(previous.options) !== JSON.stringify(g.options);
      return { ...previous, ...g, ...(imported && changed ? { availability: "unconfirmed" } : {}) };
    }),
  ];
}