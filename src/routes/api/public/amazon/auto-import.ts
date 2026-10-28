import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Rotina automática da Amazon: varre categorias de produtos nacionais, filtra
// ofertas de boa procedência (nota, volume de avaliações, selo oficial, envio
// pela Amazon e preço coerente) e publica em lote na vitrine. Respeita o botão
// de pausa do painel (supplier_integrations.auto_sync, provider "amazon").
export const Route = createFileRoute("/api/public/amazon/auto-import")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integration, error } = await supabaseAdmin
      .from("supplier_integrations")
      .select("id,store_id,auto_sync,product_mapping")
      .eq("provider", "amazon")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!integration) return Response.json({ idle: true, reason: "Integração Amazon não configurada." });
    // Stock protection stays active even when new imports are paused.
    const { refreshAmazonStockBatch } = await import("@/lib/amazon-stock.server");
    const stock = await refreshAmazonStockBatch(supabaseAdmin, integration.store_id);
    if (!integration.auto_sync) return Response.json({ paused: true, stock });

    const mapping = (integration.product_mapping ?? {}) as Record<string, unknown>;
    const cursor = Number(mapping.auto_cursor ?? 0) || 0;

    const { runAmazonAutoImport, AMAZON_AUTO_KEYWORDS } = await import("@/lib/amazon-auto.server");
    try {
      const result = await runAmazonAutoImport(supabaseAdmin, integration.store_id, cursor);
      const nextCursor = (cursor + 2) % (AMAZON_AUTO_KEYWORDS.length * 10);
      const summary = result.searchFailures ? `${result.searchFailures} busca(s) falharam; ${result.published} publicados.` : result.failed ? `${result.failed} página(s) de produto falharam; ${result.published} publicados.` : result.published === 0 ? `Sem novos produtos: ${result.candidates} candidatos, ${result.skippedExisting} repetidos, ${result.rejectedPrice} preços rejeitados.` : null;
      const { error: saveError } = await supabaseAdmin
        .from("supplier_integrations")
        .update({
          product_mapping: { ...mapping, auto_cursor: nextCursor, auto_last_result: result },
          last_catalog_sync_at: new Date().toISOString(),
          last_error: summary,
        })
        .eq("id", integration.id);
      if (saveError) throw saveError;
      return Response.json({ ...result, nextCursor, stock });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Falha na importação automática Amazon.";
      await supabaseAdmin
        .from("supplier_integrations")
        .update({ last_error: message.slice(0, 500) })
        .eq("id", integration.id);
      throw caught;
    }
  } } },
});
