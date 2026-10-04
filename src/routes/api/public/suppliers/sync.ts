import { createFileRoute } from "@tanstack/react-router";
import type { DropiFieldMapping } from "@/lib/dropi.server";

export const Route = createFileRoute("/api/public/suppliers/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["LOVABLE_CRON_SECRET"];
        const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !provided || provided !== expected)
          return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integrations, error } = await supabaseAdmin
          .from("supplier_integrations")
          .select("store_id,margin_percent,provider")
          .eq("status", "active")
          .eq("auto_sync", true);
        if (error) throw error;
        const { syncCjCatalog } = await import("@/lib/suppliers.server");
        const { syncDropiCatalog } = await import("@/lib/dropi.server");
        const results = [];
        for (const integration of integrations ?? []) {
          if (integration.provider === "cj") {
            const catalog = await syncCjCatalog(
              supabaseAdmin,
              integration.store_id,
              Number(integration.margin_percent),
            );
            results.push({ provider: "cj", storeId: integration.store_id, ...catalog });
            continue;
          }
          if (integration.provider === "dropi") {
            const { data: dropi } = await supabaseAdmin
              .from("supplier_integrations")
              .select("api_base_url,integrator_id,product_endpoint,product_mapping")
              .eq("store_id", integration.store_id)
              .eq("provider", "dropi")
              .single();
            if (!dropi?.api_base_url || !dropi.integrator_id) continue;
            const catalog = await syncDropiCatalog(supabaseAdmin, {
              storeId: integration.store_id,
              apiBaseUrl: dropi.api_base_url,
              integratorId: dropi.integrator_id,
              productEndpoint: dropi.product_endpoint,
              marginPercent: Number(integration.margin_percent),
              mapping: dropi.product_mapping as unknown as DropiFieldMapping,
            });
            results.push({ provider: "dropi", storeId: integration.store_id, ...catalog });
          }
        }
        return Response.json({ results });
      },
    },
  },
});
