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
          const body = (await request.json().catch(() => ({}))) as {
            start?: unknown;
            end?: unknown;
          };
          const isUuidBoundary = (value: unknown) =>
            typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
          const range = isUuidBoundary(body.start)
            ? {
                start: body.start as string,
                ...(isUuidBoundary(body.end) ? { end: body.end as string } : {}),
              }
            : undefined;
          return Response.json(await translateCjProductBatch(supabaseAdmin, 50, range));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha na tradução do catálogo.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});