import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { boletoPayer, boletoDetails } from "@/lib/boleto";

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
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  shippingAddress: z
    .object({
      name: z.string().trim().min(2).max(100),
      phone: z.string().trim().max(20),
      address: z.string().trim().min(5).max(200),
      city: z.string().trim().min(2).max(100),
      state: z.string().trim().length(2),
      postalCode: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().length(8)),
      note: z.string().trim().max(200),
    })
    .optional(),
  shippingQuoteIds: z.record(z.string(), z.string().uuid()),
  couponId: z.string().uuid().optional(),
  warranty: z
    .object({
      id: z.string(),
      title: z.string(),
      amount: z.number().min(0),
    })
    .optional(),
});

export const createMarketplaceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => checkoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAmazonStock } = await import("@/lib/amazon-stock.server");
    await assertAmazonStock(supabaseAdmin, data.items);
    const rpcArguments = {
      _items: data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      _shipping_address: data.shippingAddress
        ? { ...data.shippingAddress, postal_code: data.shippingAddress.postalCode }
        : null,
      _shipping_quote_ids: data.shippingQuoteIds,
      ...(data.couponId ? { _coupon_id: data.couponId } : {}),
      ...(data.warranty ? { _warranty_id: data.warranty.id } : {}),
    };
    const request = context.supabase.rpc("create_marketplace_checkout", rpcArguments);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("O checkout demorou mais que o esperado. Tente novamente.")),
        20_000,
      );
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
  method: z.enum(["pix", "card", "boleto"]),
  boleto: z.object({
    identificationNumber: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().length(11)),
    firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(100),
    address: z.object({
      zipCode: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().length(8)),
      streetName: z.string().trim().min(2).max(150), streetNumber: z.string().trim().min(1).max(20),
      neighborhood: z.string().trim().min(2).max(100), city: z.string().trim().min(2).max(100),
      state: z.string().trim().toUpperCase().regex(/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/),
    }),
  }).optional(),
  pix: z
    .object({
      identificationNumber: z
        .string()
        .transform((value) => value.replace(/\D/g, ""))
        .pipe(z.string().length(11)),
    })
    .optional(),
  card: z
    .object({
      token: z.string().min(10).max(500),
      paymentMethodId: z.string().min(1).max(80),
      issuerId: z.string().max(80).optional(),
      installments: z.number().int().min(1).max(24),
      email: z.string().email(),
      identificationType: z.string().max(20).optional(),
      identificationNumber: z.string().max(30).optional(),
    })
    .optional(),
});

type PaymentResponse = {
  id: number;
  status: string;
  status_detail?: string;
  payment_method_id?: string;
  date_of_expiration?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
  transaction_details?: { external_resource_url?: string };
  barcode?: { content?: string };
};

type MercadoPagoUser = {
  id: number;
  email?: string;
  identification?: { number?: string };
};

const transactionSchema = z.object({ transactionId: z.string().uuid() });
const orderSchema = z.object({ orderId: z.string().uuid() });

async function applyPaymentStatus(transactionId: string, payment: PaymentResponse) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("apply_mercado_pago_status", {
    _transaction_id: transactionId,
    _provider_payment_id: String(payment.id),
    _status: payment.status,
    _payment_method: payment.payment_method_id ?? "",
    _provider_payload: boletoDetails(payment),
  });
  if (error) throw error;
}

export const reconcileMercadoPagoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => transactionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: transaction, error } = await context.supabase
      .from("payment_transactions")
      .select("id,store_id,provider_payment_id,status")
      .eq("id", data.transactionId)
      .eq("buyer_id", context.userId)
      .maybeSingle();
    if (error || !transaction) throw new Error("Transação não encontrada.");
    if (!transaction.provider_payment_id || transaction.status === "approved") {
      return { status: transaction.status };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: account } = await supabaseAdmin
      .from("mercado_pago_accounts")
      .select("access_token_encrypted")
      .eq("store_id", transaction.store_id)
      .maybeSingle();
    if (!account) throw new Error("A conta Mercado Pago da loja precisa ser reconectada.");
    const { decryptSecret, mercadoPagoRequest } = await import("@/lib/mercado-pago.server");
    const payment = await mercadoPagoRequest<PaymentResponse>(
      `/v1/payments/${encodeURIComponent(transaction.provider_payment_id)}`,
      await decryptSecret(account.access_token_encrypted),
    );
    await applyPaymentStatus(transaction.id, payment);
    return { status: payment.status };
  });

export const cancelUnpaidMarketplaceOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("cancel_unpaid_marketplace_order_for_buyer", {
      _order_id: data.orderId,
      _buyer_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createMercadoPagoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => paymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { decryptSecret, mercadoPagoRequest, safeOrigin } = await import("@/lib/mercado-pago.server");
    const origin = safeOrigin(data.origin);
    const paymentNotificationOrigin =
      origin === "http://localhost:8080" || origin.endsWith(".lovable.app")
        ? "https://hs-digital-marck.lovable.app"
        : origin;
    const { data: transaction, error } = await context.supabase
      .from("payment_transactions")
      .select("id,order_id,store_id,gross_amount,platform_fee,status,provider_payment_id")
      .eq("id", data.transactionId)
      .eq("buyer_id", context.userId)
      .maybeSingle();
    if (error || !transaction) throw new Error("Transação não encontrada.");
    if (transaction.status === "approved") return { status: "approved" as const };
    if (transaction.provider_payment_id) throw new Error("Este pagamento já foi iniciado.");
    if (data.method === "pix" && !data.pix) throw new Error("Informe o CPF do pagador para gerar o Pix.");
    if (data.method === "card" && !data.card) throw new Error("Dados do cartão ausentes.");
    if (data.method === "boleto" && !data.boleto) throw new Error("Informe o CPF, nome completo e endereço do pagador para gerar o boleto.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: account }, { data: settings }] = await Promise.all([
      supabaseAdmin
        .from("mercado_pago_accounts")
        .select("access_token_encrypted,mercado_pago_user_id")
        .eq("store_id", transaction.store_id)
        .maybeSingle(),
      supabaseAdmin
        .from("payment_provider_settings")
        .select("access_token_encrypted")
        .eq("provider", "mercadopago")
        .maybeSingle(),
    ]);
    if (!account) throw new Error("A loja ainda não conectou a carteira Mercado Pago.");
    if (!settings) throw new Error("O Mercado Pago ainda não foi configurado pelo administrador.");
    const { data: orderItems, error: itemsError } = await context.supabase.from("order_items")
      .select("product_id,quantity").eq("order_id", transaction.order_id).eq("store_id", transaction.store_id);
    if (itemsError || !orderItems?.length) throw new Error("Não foi possível confirmar os produtos do pedido.");
    const { assertAmazonStock } = await import("@/lib/amazon-stock.server");
    await assertAmazonStock(supabaseAdmin, orderItems.map((item) => ({ productId: item.product_id, quantity: item.quantity })));
    const accessToken = await decryptSecret(account.access_token_encrypted);
    const platformAccessToken = await decryptSecret(settings.access_token_encrypted);
    const [platformUser, collectorUser] = await Promise.all([
      mercadoPagoRequest<MercadoPagoUser>("/users/me", platformAccessToken),
      mercadoPagoRequest<MercadoPagoUser>("/users/me", accessToken),
    ]);
    const isPlatformOwnedStore = String(platformUser.id) === account.mercado_pago_user_id;
    const { data: user } = await context.supabase.auth.getUser();
    const buyerId = user.user?.id;
    if (!buyerId) throw new Error("Usuário não autenticado.");
    const email = data.card?.email ?? user.user?.email;
    if (!email) throw new Error("E-mail do comprador não encontrado.");
    if (collectorUser.email && collectorUser.email.toLowerCase() === email.toLowerCase()) {
      throw new Error(
        "O Mercado Pago não permite pagar uma venda para a própria conta. Use uma conta compradora diferente.",
      );
    }
    const payerCpf = data.method === "boleto" ? data.boleto?.identificationNumber : data.pix?.identificationNumber;
    const collectorDocument = collectorUser.identification?.number?.replace(/\D/g, "");
    if (payerCpf && collectorDocument && payerCpf === collectorDocument) {
      throw new Error("O Mercado Pago não permite pagar usando o CPF do titular da conta vendedora.");
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", buyerId)
      .maybeSingle();

    const fullNameParts = (profile?.full_name || "Cliente").trim().split(/\s+/);
    const firstName = fullNameParts[0] || "Cliente";
    const lastName = fullNameParts.length > 1 ? fullNameParts.slice(1).join(" ") : "HS";

    const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const body: Record<string, unknown> = {
      transaction_amount: Number(transaction.gross_amount),
      description: `Pedido HS Digital ${transaction.order_id.slice(0, 8).toUpperCase()}`,
      external_reference: transaction.id,
      notification_url: `${paymentNotificationOrigin}/api/public/mercado-pago/webhook`,
      payer: {
        email,
        first_name: firstName,
        last_name: lastName,
      },
      metadata: { order_id: transaction.order_id, transaction_id: transaction.id, store_id: transaction.store_id },
    };

    if (!isPlatformOwnedStore) {
      body["application_fee"] = Number(transaction.platform_fee);
    }

    if (data.method === "pix") {
      body["payment_method_id"] = "pix";
      body["date_of_expiration"] = expiration;
      body["payer"] = {
        email,
        first_name: firstName,
        last_name: lastName,
        identification: { type: "CPF", number: data.pix?.identificationNumber },
      };
    } else if (data.method === "boleto" && data.boleto) {
      const methods = await mercadoPagoRequest<Array<{ id: string; status: string }>>("/v1/payment_methods", accessToken);
      if (!methods.some((method) => method.id === "bolbradesco" && method.status === "active")) {
        throw new Error("Boleto não está disponível na conta Mercado Pago desta loja. Escolha Pix ou cartão.");
      }
      body["payment_method_id"] = "bolbradesco";
      body["payer"] = boletoPayer(email, data.boleto);
    } else if (data.card) {
      body["token"] = data.card.token;
      body["payment_method_id"] = data.card.paymentMethodId;
      body["issuer_id"] = data.card.issuerId;
      body["installments"] = data.card.installments;
      body["payer"] = {
        email,
        identification:
          data.card.identificationType && data.card.identificationNumber
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
        provider_payload: boletoDetails(payment),
      })
      .eq("id", transaction.id);
    if (updateError) throw updateError;
    if (payment.status === "approved") {
      await applyPaymentStatus(transaction.id, payment);
    }
    return {
      status: payment.status,
      qrCode: qr?.qr_code ?? null,
      qrCodeBase64: qr?.qr_code_base64 ?? null,
      expiresAt: payment.date_of_expiration ?? null,
      boleto: data.method === "boleto" ? boletoDetails(payment) : null,
    };
  });
