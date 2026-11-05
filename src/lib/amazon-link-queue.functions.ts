import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseAmazonLinkBatch, validateAmazonProductUrl, AMAZON_LINK_BATCH_LIMIT } from "./amazon-link-batch";

const ALLOWED_EMAILS = ["hugoet373@gmail.com", "hugohug12ou@gmail.com"];

/** Queues links on the server; the scheduled worker reads them even after the app is closed. */
export const enqueueAmazonLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    storeId: z.string().uuid(),
    links: z.string().max(50000).optional(),
    pageUrl: z.string().max(2000).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const email = String(context.claims?.email ?? "").toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) throw new Error("Recurso exclusivo da administração.");
    const { data: store } = await context.supabase.from("stores").select("id").eq("id", data.storeId).eq("owner_id", context.userId).maybeSingle();
    if (!store) throw new Error("Você só pode importar para a sua própria loja.");

    let rows: { url: string; grp: string | null }[] = [];
    let summary = "";
    if (data.pageUrl) {
      const { readAmazonResultsPageCore } = await import("./amazon-page.server");
      const page = await readAmazonResultsPageCore(data.pageUrl);
      summary = `${page.cheap} baratos · ${page.moderate} intermediários · ${page.eligible} passaram pelos filtros da página`;
      rows = page.items.map((item) => ({ url: validateAmazonProductUrl(item.url), grp: item.group ?? null }));
    } else {
      rows = parseAmazonLinkBatch(data.links ?? "").map((url) => ({ url, grp: null }));
    }
    rows = rows.slice(0, AMAZON_LINK_BATCH_LIMIT);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: clearError } = await supabaseAdmin.from("amazon_link_jobs").delete().eq("owner_id", context.userId).neq("status", "published");
    if (clearError) throw clearError;
    if (rows.length) {
      const { error } = await supabaseAdmin.from("amazon_link_jobs").insert(rows.map((row) => ({ ...row, owner_id: context.userId, store_id: store.id })));
      if (error) throw error;
    }
    return { queued: rows.length, summary };
  });
