import { createFileRoute } from "@tanstack/react-router";

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
        const results = [];
        for (const integration of integrations ?? []) {
          if (integration.provider !== "cj") continue;
          const catalog = await syncCjCatalog(
            supabaseAdmin,
            integration.store_id,
            Number(integration.margin_percent),
          );
          results.push({ provider: "cj", storeId: integration.store_id, ...catalog });
        }
        return Response.json({ results });
      },
    },
  },
});
