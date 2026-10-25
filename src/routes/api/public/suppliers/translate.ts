import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/suppliers/translate")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["LOVABLE_CRON_SECRET"];
        const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !provided || provided !== expected)
          return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processCjContentJob } = await import("@/lib/cj-content.server");
        try {
          const { data: jobs, error } = await supabaseAdmin.from("supplier_content_jobs")
            .select("store_id").eq("operation", "titles").in("status", ["pending", "running"])
            .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`).order("updated_at").limit(1);
          if (error) throw error;
          const job = jobs?.[0];
          return Response.json(job ? await processCjContentJob(supabaseAdmin, job.store_id, "titles") : { idle: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha na tradução do catálogo.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});