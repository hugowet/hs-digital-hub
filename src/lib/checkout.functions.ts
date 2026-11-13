import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getShippingIdentity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("hs_shipping_identity");
    if (error) throw error;
    const result = data as { admin?: boolean; club?: boolean; storeIds?: string[] } | null;
    return { admin: result?.admin === true, club: result?.club === true, storeIds: result?.storeIds ?? [] };
  });

export const getFirstPurchaseShippingEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", context.userId)
      .not("status", "in", '("cancelled","payment_failed")');
    if (error) throw error;
    return { eligible: (count ?? 0) === 0 };
  });