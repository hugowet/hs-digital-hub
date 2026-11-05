import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Background reader for queued Amazon links: runs on a schedule, so imports
// continue after the seller closes the app. Products are only staged here;
// publication stays an explicit seller action.
const PER_RUN = 3;

export const Route = createFileRoute("/api/public/amazon/link-queue")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { readAmazonProductPage } = await import("@/lib/amazon.functions");
    const { amazonNextAllowedAt, isAmazonRoundStop, amazonRecoveryAt } = await import("@/lib/amazon-request-policy");
    const { describeAmazonSearchError } = await import("@/lib/amazon-search-diagnostics");
    let processed = 0;
    for (let i = 0; i < PER_RUN; i++) {
      const now = new Date().toISOString();
      const { data: job, error } = await supabaseAdmin.from("amazon_link_jobs")
        .select("id,url,attempts,status")
        .in("status", ["pending", "processing"])
        .or(`locked_until.is.null,locked_until.lt.${now}`)
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (error) throw error;
      if (!job) break;
      // Claim with a lease; a concurrent run that loses the race skips it.
      const { data: claimed } = await supabaseAdmin.from("amazon_link_jobs")
        .update({ status: "processing", attempts: job.attempts + 1, locked_until: new Date(Date.now() + 120000).toISOString(), updated_at: now })
        .eq("id", job.id).eq("attempts", job.attempts).select("id").maybeSingle();
      if (!claimed) continue;
      if (i > 0) await new Promise((r) => setTimeout(r, Math.max(0, amazonNextAllowedAt() - Date.now())));
      try {
        const data = await readAmazonProductPage(job.url);
        if (!data.title || !data.mainImage || data.costPrice <= 0) throw new Error("Dados incompletos: faltou nome, foto ou preço. Confira o anúncio.");
        await supabaseAdmin.from("amazon_link_jobs").update({ status: "done", data, error: null, locked_until: null, updated_at: new Date().toISOString() }).eq("id", job.id);
        processed++;
      } catch (caught) {
        if (isAmazonRoundStop(caught) && job.attempts + 1 < 4) {
          const diagnostic = describeAmazonSearchError(caught);
          await supabaseAdmin.from("amazon_link_jobs").update({ status: "pending", locked_until: new Date(amazonRecoveryAt(diagnostic)).toISOString(), error: diagnostic.reason }).eq("id", job.id);
          break;
        }
        const message = caught instanceof Error ? caught.message : "Falha ao ler o produto.";
        await supabaseAdmin.from("amazon_link_jobs").update({ status: "error", error: message, locked_until: null, updated_at: new Date().toISOString() }).eq("id", job.id);
      }
    }
    return Response.json({ processed });
  } } },
});
