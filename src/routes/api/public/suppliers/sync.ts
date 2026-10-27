import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Rotina automática da CJ: "catalog" importa novas categorias/produtos em lotes,
// "stock" atualiza o estoque dos produtos mais antigos primeiro (lote limitado).
export const Route = createFileRoute("/api/public/suppliers/sync")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const operation = body.operation === "stock" ? "stock" : "catalog";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integration, error } = await supabaseAdmin
      .from("supplier_integrations")
      .select("store_id,margin_percent,auto_sync")
      .eq("provider", "cj")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!integration) return Response.json({ idle: true });
    if (operation === "catalog" && !integration.auto_sync) return Response.json({ paused: true, reason: "Importação automática pausada pelo dono." });

    const { syncCjCatalog, syncCjStockBatch } = await import("@/lib/suppliers.server");
    try {
      const result = operation === "stock"
        ? await syncCjStockBatch(supabaseAdmin, integration.store_id, 60)
        : await syncCjCatalog(supabaseAdmin, integration.store_id, Number(integration.margin_percent ?? 35));
      return Response.json(result);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Falha na sincronização CJ.";
      // Limite de pontos da CJ: pausa até a próxima execução agendada, sem derrubar a rotina.
      if (/insufficient api points/i.test(message)) {
        return Response.json({ paused: true, reason: "Pontos da API da CJ esgotados; retomando na próxima execução." });
      }
      throw caught;
    }
  } } },
});
