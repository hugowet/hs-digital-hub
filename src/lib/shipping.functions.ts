import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const quoteSchema = z.object({
  postalCode: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().length(8)),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1).max(50),
});

export const quoteMarketplaceShipping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => quoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { calculateShippingQuotes } = await import("@/lib/shipping.server");
    return calculateShippingQuotes(supabaseAdmin, context.userId, data.postalCode, data.items);
  });