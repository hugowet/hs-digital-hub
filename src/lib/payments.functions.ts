import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const settingsSchema = z.object({
  publicKey: z.string().min(8).max(300),
  accessToken: z.string().min(8).max(1000),
  clientId: z.string().min(3).max(200),
  clientSecret: z.string().min(8).max(1000),
  webhookSecret: z.string().min(16).max(1000),
});

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso de administrador necessário.");
}

export const getMercadoPagoConfiguration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("payment_provider_settings")
      .select("public_key,environment,configured_at")
      .eq("provider", "mercadopago")
      .maybeSingle();
    return {
      configured: Boolean(data),
      publicKey: data?.public_key ?? "",
      environment: data?.environment ?? "production",
      configuredAt: data?.configured_at ?? null,
    };
  });

export const getMercadoPagoPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_provider_settings")
    .select("public_key")
    .eq("provider", "mercadopago")
    .maybeSingle();
  return { configured: Boolean(data?.public_key), publicKey: data?.public_key ?? "" };
});

export const saveMercadoPagoConfiguration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { encryptSecret, mercadoPagoRequest } = await import("@/lib/mercado-pago.server");
    await mercadoPagoRequest<{ id: number }>("/users/me", data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payment_provider_settings").upsert({
      provider: "mercadopago",
      public_key: data.publicKey.trim(),
      access_token_encrypted: await encryptSecret(data.accessToken.trim()),
      client_id: data.clientId.trim(),
      client_secret_encrypted: await encryptSecret(data.clientSecret.trim()),
      webhook_secret_encrypted: await encryptSecret(data.webhookSecret.trim()),
      environment: "production",
      configured_by: context.userId,
      configured_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  });

export const startMercadoPagoConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { safeOrigin, sha256 } = await import("@/lib/mercado-pago.server");
    const origin = safeOrigin(data.origin);
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store) throw new Error("Loja não encontrada.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("payment_provider_settings")
      .select("client_id")
      .eq("provider", "mercadopago")
      .maybeSingle();
    if (!settings) throw new Error("O administrador ainda não configurou o Mercado Pago.");

    const state = crypto.randomUUID() + crypto.randomUUID();
    const { error } = await supabaseAdmin.from("mercado_pago_oauth_states").insert({
      state_hash: await sha256(state),
      store_id: data.storeId,
      user_id: context.userId,
      redirect_origin: origin,
    });
    if (error) throw error;
    const redirectUri = `${origin}/api/public/mercado-pago/oauth-callback`;
    const params = new URLSearchParams({
      client_id: settings.client_id,
      response_type: "code",
      platform_id: "mp",
      state,
      redirect_uri: redirectUri,
    });
    return { url: `https://auth.mercadopago.com.br/authorization?${params.toString()}` };
  });

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1).max(50),
  shippingAddress: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(20),
    address: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(100),
    note: z.string().trim().max(200),
  }),
});

export const createMarketplaceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => checkoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const request = context.supabase.rpc("create_marketplace_order", {
      _items: data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      _shipping_address: data.shippingAddress,
    });
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("O checkout demorou mais que o esperado. Tente novamente.")), 20_000);
    });
    const result = await Promise.race([request, timeout]).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
    const { data: orderId, error } = result;
    if (error || !orderId) throw new Error(error?.message ?? "Não foi possível criar o pedido.");
    return { orderId };
  });

const paymentSchema = z.object({
  transactionId: z.string().uuid(),
  origin: z.string().url(),
  method: z.enum(["pix", "card"]),
  card: z.object({
    token: z.string().min(10).max(500),
    paymentMethodId: z.string().min(1).max(80),
    issuerId: z.string().max(80).optional(),
    installments: z.number().int().min(1).max(24),
    email: z.string().email(),
    identificationType: z.string().max(20).optional(),
    identificationNumber: z.string().max(30).optional(),
  }).optional(),
});

type PaymentResponse = {
  id: number;
  status: string;
  status_detail?: string;
  payment_method_id?: string;
  date_of_expiration?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

export const createMercadoPagoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => paymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { decryptSecret, mercadoPagoRequest, safeOrigin } = await import("@/lib/mercado-pago.server");
    const origin = safeOrigin(data.origin);
    const { data: transaction, error } = await context.supabase
      .from("payment_transactions")
      .select("id,order_id,store_id,gross_amount,platform_fee,status,provider_payment_id")
      .eq("id", data.transactionId)
      .eq("buyer_id", context.userId)
      .maybeSingle();
    if (error || !transaction) throw new Error("Transação não encontrada.");
    if (transaction.status === "approved") return { status: "approved" as const };
    if (transaction.provider_payment_id) throw new Error("Este pagamento já foi iniciado.");
    if (data.method === "card" && !data.card) throw new Error("Dados do cartão ausentes.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: account } = await supabaseAdmin
      .from("mercado_pago_accounts")
      .select("access_token_encrypted")
      .eq("store_id", transaction.store_id)
      .maybeSingle();
    if (!account) throw new Error("A loja ainda não conectou a carteira Mercado Pago.");
    const accessToken = await decryptSecret(account.access_token_encrypted);
    const { data: user } = await context.supabase.auth.getUser();
    const email = data.card?.email ?? user.user?.email;
    if (!email) throw new Error("E-mail do comprador não encontrado.");

    const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const body: Record<string, unknown> = {
      transaction_amount: Number(transaction.gross_amount),
      description: `Pedido HS Digital ${transaction.order_id.slice(0, 8).toUpperCase()}`,
      external_reference: transaction.id,
      notification_url: `${origin}/api/public/mercado-pago/webhook`,
      application_fee: Number(transaction.platform_fee),
      payer: { email },
      metadata: { order_id: transaction.order_id, transaction_id: transaction.id, store_id: transaction.store_id },
    };
    if (data.method === "pix") {
      body["payment_method_id"] = "pix";
      body["date_of_expiration"] = expiration;
    } else if (data.card) {
      body["token"] = data.card.token;
      body["payment_method_id"] = data.card.paymentMethodId;
      body["issuer_id"] = data.card.issuerId;
      body["installments"] = data.card.installments;
      body["payer"] = {
        email: data.card.email,
        identification: data.card.identificationType && data.card.identificationNumber
          ? { type: data.card.identificationType, number: data.card.identificationNumber }
          : undefined,
      };
    }

    const payment = await mercadoPagoRequest<PaymentResponse>("/v1/payments", accessToken, {
      method: "POST",
      headers: { "X-Idempotency-Key": transaction.id },
      body: JSON.stringify(body),
    });
    const qr = payment.point_of_interaction?.transaction_data;
    const { error: updateError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        provider_payment_id: String(payment.id),
        status: payment.status,
        payment_method: payment.payment_method_id ?? data.method,
        pix_qr_code: qr?.qr_code ?? null,
        pix_qr_code_base64: qr?.qr_code_base64 ?? null,
        payment_expires_at: payment.date_of_expiration ?? (data.method === "pix" ? expiration : null),
        provider_payload: { status_detail: payment.status_detail ?? null },
      })
      .eq("id", transaction.id);
    if (updateError) throw updateError;
    if (payment.status === "approved") {
      const { error: applyError } = await supabaseAdmin.rpc("apply_mercado_pago_status", {
        _transaction_id: transaction.id,
        _provider_payment_id: String(payment.id),
        _status: payment.status,
        _payment_method: payment.payment_method_id ?? data.method,
        _provider_payload: { status_detail: payment.status_detail ?? null },
      });
      if (applyError) throw applyError;
    }
    return {
      status: payment.status,
      qrCode: qr?.qr_code ?? null,
      qrCodeBase64: qr?.qr_code_base64 ?? null,
      expiresAt: payment.date_of_expiration ?? null,
    };
  });