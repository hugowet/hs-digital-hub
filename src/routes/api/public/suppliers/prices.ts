import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/suppliers/prices")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expiry = await supabaseAdmin.rpc("expire_club_pix_memberships");
    if (expiry.error) throw expiry.error;
    const { refreshCjPrices } = await import("@/lib/cj-price-refresh.server");
    const { data: stores, error } = await supabaseAdmin.from("supplier_integrations")
      .select("store_id").eq("provider", "cj").eq("status", "active").limit(20);
    if (error) throw error;
    const results = [];
    for (const store of stores ?? []) {
      try { results.push(await refreshCjPrices(supabaseAdmin, store.store_id)); }
      catch { results.push({ paused: true }); }
    }
    return Response.json({ results });
  } } },
});