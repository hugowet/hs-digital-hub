import { z } from "zod";

export const US_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
export const BR_SIZES = ["P", "M", "G", "GG", "XG"] as const;
export const OPTION_COLORS = ["Preto", "Branco", "Azul", "Vermelho", "Verde", "Rosa", "Cinza", "Amarelo"] as const;
const option = z.string().trim().min(1).max(80).refine((v) => !/[:·]/.test(v), "Não use : ou · na opção.");
export const manualOptionsSchema = z.array(z.object({
  name: z.enum(["Cor", "Tamanho", "Tamanho (US)"]),
  options: z.array(option).min(1).max(50),
})).max(3).refine((groups) => new Set(groups.map((g) => g.name)).size === groups.length, "Grupo repetido.");
export function manualProductOptions(colors: string[], sizes: string[], system: "BR" | "US") {
  return manualOptionsSchema.parse([
    ...(colors.length ? [{ name: "Cor", options: [...new Set(colors)] }] : []),
    ...(sizes.length ? [{ name: system === "US" ? "Tamanho (US)" : "Tamanho", options: [...new Set(sizes)] }] : []),
  ]);
}
export function productShippingOrigin(product: { supplier?: string | null; shipping_origin?: string | null }) {
  if (product.shipping_origin === "national" || product.shipping_origin === "international") return product.shipping_origin;
  return product.supplier === "cj" ? "international" : product.supplier === "amazon" ? "national" : null;
}