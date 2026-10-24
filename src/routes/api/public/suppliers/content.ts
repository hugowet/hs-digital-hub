import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/suppliers/content")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const operation = body.operation === "titles" ? "titles" : "details";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { processCjContentJob } = await import("@/lib/cj-content.server");
    const { data: jobs, error } = await supabaseAdmin.from("supplier_content_jobs").select("store_id")
      .eq("operation", operation).in("status", ["pending", "running"]).order("updated_at").limit(1);
    if (error) throw error;
    const job = jobs?.[0];
    if (!job) return Response.json({ idle: true });
    return Response.json(await processCjContentJob(supabaseAdmin, job.store_id, operation));
  } } },
});