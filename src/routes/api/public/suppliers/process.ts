import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/suppliers/process")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: queue, error } = await supabaseAdmin.from("supplier_fulfillments")
          .select("id,provider,attempts")
          .in("status", ["pending", "retry"])
          .lte("next_attempt_at", new Date().toISOString())
          .order("created_at").limit(20);
        if (error) throw error;
        const { submitCjFulfillment } = await import("@/lib/suppliers.server");
        let processed = 0;
        for (const item of queue ?? []) {
          if (item.provider !== "cj") continue;
          try {
            await submitCjFulfillment(supabaseAdmin, item.id);
            processed += 1;
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : "Falha ao enviar pedido ao fornecedor.";
            const attempts = item.attempts + 1;
            await supabaseAdmin.from("supplier_fulfillments").update({
              status: attempts >= 5 ? "failed" : "retry",
              attempts,
              last_error: message.slice(0, 1000),
              next_attempt_at: new Date(Date.now() + Math.min(60, attempts * 10) * 60_000).toISOString(),
            }).eq("id", item.id);
          }
        }
        return Response.json({ processed });
      },
    },
  },
});
