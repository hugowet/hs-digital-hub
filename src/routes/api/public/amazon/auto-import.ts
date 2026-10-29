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
    const mapping = (integration.product_mapping ?? {}) as Record<string, unknown>;
    const cursor = Number(mapping.auto_cursor ?? 0) || 0;
    const nextAllowedAt = Number(mapping.auto_next_allowed_at ?? 0) || 0;
    if (Date.now() < nextAllowedAt) return Response.json({ deferred: true, nextAllowedAt });
    const { amazonNextAllowedAt } = await import('@/lib/amazon-request-policy');
    const { describeAmazonSearchError } = await import('@/lib/amazon-search-diagnostics');

    const { runAmazonAutoImport, AMAZON_AUTO_KEYWORDS } = await import("@/lib/amazon-auto.server");
    try {
      // Alternate one stock read and one queued catalog read; never sleep in cron.
      if (!integration.auto_sync || mapping.auto_phase === 'stock') {
        const { refreshAmazonStockBatch } = await import('@/lib/amazon-stock.server');
        const stock = await refreshAmazonStockBatch(supabaseAdmin, integration.store_id, 1);
        const { error: saveError } = await supabaseAdmin.from('supplier_integrations').update({ product_mapping: { ...mapping, auto_phase: 'import', auto_next_allowed_at: amazonNextAllowedAt() } }).eq('id', integration.id);
        if (saveError) throw saveError;
        return Response.json({ paused: !integration.auto_sync, stock });
      }
      const pending = Array.isArray(mapping.auto_pending) ? mapping.auto_pending.slice(0, 24) : [];
      const result = await runAmazonAutoImport(supabaseAdmin, integration.store_id, cursor, { pending, nextAllowedAt });
      const nextCursor = pending.length || result.stopped ? cursor : (cursor + 1) % (AMAZON_AUTO_KEYWORDS.length * 15);
      const issues = result.searchDiagnostics.filter(page => page.outcome !== "ok");
      const summary = result.stopped?.reason ?? (issues.length ? issues.map(page => `${page.keyword}, página ${page.page}: ${page.reason}`).join(" | ") : result.failed ? `${result.failed} página(s) de produto falharam; ${result.published} publicados.` : result.published === 0 ? `Sem novos produtos: ${result.candidates} candidatos, ${result.skippedExisting} repetidos, ${result.rejectedPrice} preços rejeitados.` : null);
      const recordedAt = new Date().toISOString();
      const history = Array.isArray(mapping.auto_search_history) ? mapping.auto_search_history.slice(-11) : [];
      const { error: saveError } = await supabaseAdmin
        .from("supplier_integrations")
        .update({
          product_mapping: { ...mapping, auto_phase: 'stock', auto_pending: result.queue ?? [], auto_next_allowed_at: result.nextAllowedAt, auto_cursor: nextCursor, auto_last_result: { ...result }, auto_search_history: [...history, { recordedAt, ...result }] },
          last_catalog_sync_at: recordedAt,
          last_error: summary,
        })
        .eq("id", integration.id);
      if (saveError) throw saveError;
      return Response.json({ ...result, nextCursor });
    } catch (caught) {
      const diagnostic = describeAmazonSearchError(caught);
      await supabaseAdmin
        .from("supplier_integrations")
        .update({ last_error: diagnostic.reason, product_mapping: { ...mapping, auto_next_allowed_at: amazonNextAllowedAt(), auto_last_stop: diagnostic } })
        .eq("id", integration.id);
      throw caught;
    }
  } } },
});
