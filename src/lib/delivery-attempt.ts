import { z } from "zod";

export const deliveryAttemptInput = z.object({
  storeId: z.string().uuid(),
  orderId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  note: z.string().trim().min(1).max(500),
});