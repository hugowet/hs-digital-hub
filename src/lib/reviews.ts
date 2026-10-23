import { z } from "zod";

export const reviewInput = z.object({
  id: z.string().uuid(), productId: z.string().uuid(),
  author: z.string().trim().min(1).max(80), rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(4000), photoPaths: z.array(z.string().max(300)).max(5),
});

export function reviewPhotoPath(userId: string, productId: string, reviewId: string, index: number) {
  return `${userId}/${productId}/${reviewId}/${index}.jpg`;
}