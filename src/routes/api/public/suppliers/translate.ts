import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/suppliers/translate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["LOVABLE_CRON_SECRET"];
        const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !provided || provided !== expected)
          return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { translateCjProductBatch } = await import("@/lib/suppliers.server");
        try {
          return Response.json(await translateCjProductBatch(supabaseAdmin, 50));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha na tradução do catálogo.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});