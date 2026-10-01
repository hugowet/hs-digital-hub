import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ownedStore(context: { supabase: any; userId: string }, storeId: string) {
  const { data } = await context.supabase.from("stores").select("id").eq("id", storeId).eq("owner_id", context.userId).maybeSingle();
  if (!data) throw new Error("Loja não encontrada.");
}

const storeSchema = z.object({ storeId: z.string().uuid() });

export const syncCjProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => storeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ownedStore(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integration } = await supabaseAdmin.from("supplier_integrations")
      .select("margin_percent,status").eq("store_id", data.storeId).eq("provider", "cj").maybeSingle();
    if (!integration || integration.status !== "active") throw new Error("A integração CJ não está ativa.");
    const { syncCjCatalog } = await import("@/lib/suppliers.server");
    const catalog = await syncCjCatalog(supabaseAdmin, data.storeId, Number(integration.margin_percent));
    return catalog;
  });

export const processSupplierFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fulfillmentId: z.string().uuid(), storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ownedStore(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fulfillment } = await supabaseAdmin.from("supplier_fulfillments")
      .select("id,store_id,provider").eq("id", data.fulfillmentId).eq("store_id", data.storeId).maybeSingle();
    if (!fulfillment) throw new Error("Envio não encontrado.");
    if (fulfillment.provider !== "cj") throw new Error("O Dropi aguarda a liberação do acesso de parceiro.");
    const { submitCjFulfillment } = await import("@/lib/suppliers.server");
    await submitCjFulfillment(supabaseAdmin, fulfillment.id);
    return { ok: true };
  });
