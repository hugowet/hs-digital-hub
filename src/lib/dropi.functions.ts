import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DropiConfiguration, DropiFieldMapping } from "@/lib/dropi.server";

const fieldPath = z.string().trim().max(120).regex(/^[A-Za-z0-9_$.[\]-]*$/, "Use somente nomes e pontos no mapeamento.");
const mappingSchema = z.object({
  items: fieldPath,
  id: fieldPath.min(1),
  variantId: fieldPath,
  sku: fieldPath,
  title: fieldPath.min(1),
  description: fieldPath,
  price: fieldPath.min(1),
  stock: fieldPath,
  category: fieldPath,
  image: fieldPath,
  images: fieldPath,
});
const configurationSchema = z.object({
  storeId: z.string().uuid(),
  apiBaseUrl: z.string().trim().url().max(500),
  integratorId: z.string().trim().min(1).max(200),
  productEndpoint: z.string().trim().min(2).max(500).startsWith("/"),
  marginPercent: z.number().min(0).max(1000),
  mapping: mappingSchema,
});

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Sua conta não tem permissão de administrador.");
}

function rowToConfiguration(row: any): DropiConfiguration {
  return {
    storeId: row.store_id,
    apiBaseUrl: row.api_base_url ?? "",
    integratorId: row.integrator_id ?? "",
    productEndpoint: row.product_endpoint ?? "/products",
    marginPercent: Number(row.margin_percent),
    mapping: row.product_mapping as DropiFieldMapping,
  };
}

export const getDropiAdminConfiguration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("supplier_integrations")
      .select("store_id,status,margin_percent,last_catalog_sync_at,last_error,api_base_url,integrator_id,product_endpoint,product_mapping,stores(name)")
      .eq("provider", "dropi")
      .order("created_at");
    if (error) throw error;
    return (rows ?? []).map((row: any) => ({
      ...rowToConfiguration(row),
      storeName: row.stores?.name ?? "Loja",
      status: row.status,
      configured: Boolean(row.api_base_url && row.integrator_id && process.env["DROPI_API_KEY"]),
      lastCatalogSyncAt: row.last_catalog_sync_at,
      lastError: row.last_error,
    }));
  });

export const saveDropiAdminConfiguration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => configurationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { validateDropiUrl } = await import("@/lib/dropi.server");
    validateDropiUrl(data.apiBaseUrl, data.productEndpoint);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("supplier_integrations").upsert({
      store_id: data.storeId,
      provider: "dropi",
      api_base_url: new URL(data.apiBaseUrl).origin,
      integrator_id: data.integratorId,
      product_endpoint: data.productEndpoint,
      product_mapping: data.mapping,
      margin_percent: data.marginPercent,
      status: "pending_credentials",
      last_error: null,
    }, { onConflict: "store_id,provider" });
    if (error) throw error;
    return { ok: true };
  });

export const testDropiAdminConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => configurationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { testDropiConnection } = await import("@/lib/dropi.server");
    return testDropiConnection(data);
  });

export const importDropiAdminProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("supplier_integrations")
      .select("store_id,margin_percent,api_base_url,integrator_id,product_endpoint,product_mapping")
      .eq("store_id", data.storeId)
      .eq("provider", "dropi")
      .single();
    if (error) throw error;
    const configuration = rowToConfiguration(row);
    if (!configuration.apiBaseUrl || !configuration.integratorId) throw new Error("Salve a configuração do Dropi antes de importar.");
    const { syncDropiCatalog } = await import("@/lib/dropi.server");
    try {
      return await syncDropiCatalog(supabaseAdmin, configuration);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao importar produtos do Dropi.";
      await supabaseAdmin.from("supplier_integrations").update({ status: "error", last_error: message.slice(0, 1000) }).eq("store_id", data.storeId).eq("provider", "dropi");
      throw error;
    }
  });