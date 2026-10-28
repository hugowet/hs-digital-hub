import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { safeOrigin, sha256 } from "@/lib/mercado-pago.server";

const quoteSchema = z.object({
  postalCode: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().length(8)),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1).max(50),
});

export const quoteMarketplaceShipping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => quoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { calculateShippingQuotes, quoteCartShipping } = await import("@/lib/shipping.server");
    const quoteFn = calculateShippingQuotes || quoteCartShipping;
    return quoteFn(supabaseAdmin, context.userId, data.postalCode, data.items);
  });

const sellerShippingSchema = z.object({
  storeId: z.string().uuid(),
  originPostalCode: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().length(8)),
});

async function requireOwnedStore(context: { supabase: any; userId: string }, storeId: string) {
  const { data } = await context.supabase.from("stores").select("id")
    .eq("id", storeId).eq("owner_id", context.userId).maybeSingle();
  if (!data) throw new Error("Loja não encontrada.");
}

export const getSellerShippingConfiguration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwnedStore(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: store }, { data: integration }] = await Promise.all([
      supabaseAdmin.from("stores").select("origin_postal_code").eq("id", data.storeId).single(),
      supabaseAdmin.from("seller_shipping_integrations").select("status,last_error,updated_at")
        .eq("store_id", data.storeId).eq("provider", "melhor_envio").maybeSingle(),
    ]);
    return { originPostalCode: store?.origin_postal_code ?? "", status: integration?.status ?? "pending_credentials", lastError: integration?.last_error ?? null };
  });

export const saveSellerOriginPostalCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sellerShippingSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireOwnedStore(context, data.storeId);
    const { error } = await context.supabase.from("stores").update({ origin_postal_code: data.originPostalCode })
      .eq("id", data.storeId).eq("owner_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const startMelhorEnvioConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwnedStore(context, data.storeId);
    const clientId = process.env["MELHOR_ENVIO_CLIENT_ID"];
    if (!clientId) throw new Error("O administrador ainda não configurou o Melhor Envio.");
    const origin = safeOrigin(data.origin);
    const state = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("seller_shipping_integrations").upsert({
      store_id: data.storeId, provider: "melhor_envio", oauth_state_hash: await sha256(state),
      oauth_state_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), redirect_origin: origin, last_error: null,
    }, { onConflict: "store_id,provider" });
    if (error) throw error;
    const query = new URLSearchParams({
      client_id: clientId, redirect_uri: `${origin}/api/public/melhor-envio/oauth-callback`, response_type: "code", state,
      scope: "cart-read cart-write companies-read marketplace-read orders-read products-read shipments-calculate shipments-read shipments-write shipping-companies-read tracking-read users-read",
    });
    return { url: `https://melhorenvio.com.br/oauth/authorize?${query.toString()}` };
  });
export const saveOrderTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input) =>
      z
        .object({
          orderId: z.string().uuid(),
          storeId: z.string().uuid(),
          trackingCode: z.string().min(2).max(100),
          trackingCarrier: z.string().max(100).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireOwnedStore(context, data.storeId);
    const { error } = await context.supabase.rpc("save_seller_tracking", {
      _store_id: data.storeId, _order_id: data.orderId,
      _code: data.trackingCode.trim(), _carrier: data.trackingCarrier?.trim() || "Transportadora",
    });
    if (error) throw error;
    return { ok: true };
  });

export const getSellerOrderPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ storeId: z.string().uuid(), productIds: z.array(z.string().uuid()).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwnedStore(context, data.storeId);
    if (!data.productIds.length) return [];
    const { data: products, error } = await context.supabase.from("products").select("id,image_url").eq("store_id", data.storeId).in("id", data.productIds);
    if (error) throw error;
    const paths = (products ?? []).flatMap(p => p.image_url && !/^(https?:\/\/|\/)/.test(p.image_url) ? [p.image_url] : []);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = paths.length ? await supabaseAdmin.storage.from("product-images").createSignedUrls(paths, 3600) : null;
    if (signed?.error) throw signed.error;
    const urls = new Map(paths.map((path, i) => [path, signed?.data?.[i]?.signedUrl]));
    return (products ?? []).map(p => ({ id: p.id, image_url: p.image_url ? urls.get(p.image_url) ?? p.image_url : null }));
  });
