import { z } from "zod";

export const reviewStates = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

export const reviewInput = z.object({
  id: z.string().uuid(), productId: z.string().uuid(),
  author: z.string().trim().min(1).max(80), rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(4000), photoPaths: z.array(z.string().max(300)).max(5),
  city: z.string().trim().max(90, "Cidade deve ter até 90 caracteres.").default(""),
  state: z.union([z.enum(reviewStates), z.literal("")]).default(""),
});

export function reviewLocation(city: string, state: string) {
  const location = reviewInput.pick({ city: true, state: true }).parse({ city, state });
  return [location.city, location.state].filter(Boolean).join(" - ");
}

export function reviewPhotoPath(userId: string, productId: string, reviewId: string, index: number) {
  return `${userId}/${productId}/${reviewId}/${index}.jpg`;
}