// @ts-nocheck -- types out of sync with backend schema; see build log
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createClubeHsSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptSecret, mercadoPagoRequest, safeOrigin } = await import("@/lib/mercado-pago.server");

    const origin = safeOrigin(data.origin);

    // Obtém o token da plataforma configurado no admin
    const { data: settings } = await supabaseAdmin
      .from("payment_provider_settings")
      .select("access_token_encrypted")
      .eq("provider", "mercadopago")
      .maybeSingle();

    if (!settings?.access_token_encrypted) {
      throw new Error("Mercado Pago não está configurado na plataforma.");
    }

    const accessToken = await decryptSecret(settings.access_token_encrypted);

    const { data: identity } = await context.supabase.auth.getUser();
    const payerEmail = identity.user?.email;
    if (!payerEmail) throw new Error("Confirme o e-mail da sua conta para assinar.");

    // Criar Preapproval Plan / Subscription no Mercado Pago
    // Valor: R$ 19,90 por mês
    const preapprovalPayload = {
      reason: "Clube HS - Assinatura Mensal",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 19.9,
        currency_id: "BRL",
      },
      back_url: `${origin}/clube-hs?status=success`,
      payer_email: payerEmail,
      external_reference: context.userId,
    };

    const mpResponse = await mercadoPagoRequest<{ id: string; init_point: string }>(
      "/preapproval",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(preapprovalPayload),
      }
    );

    // Salva a intenção de assinatura no Supabase
    await supabaseAdmin.from("clube_hs_subscriptions").upsert({
      user_id: context.userId,
      preapproval_id: mpResponse.id,
      status: "pending",
      external_reference: context.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "preapproval_id" });

    return { initPoint: mpResponse.init_point };
  });

export const createClubeHsPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptSecret, mercadoPagoRequest, safeOrigin } = await import("@/lib/mercado-pago.server");
    const origin = safeOrigin(data.origin);
    const { data: settings } = await supabaseAdmin.from("payment_provider_settings")
      .select("access_token_encrypted").eq("provider", "mercadopago").maybeSingle();
    if (!settings?.access_token_encrypted) throw new Error("Pagamento do Clube indisponível. Tente novamente mais tarde.");
    const recent = await supabaseAdmin.from("clube_hs_pix_payments").select("checkout_url")
      .eq("user_id", context.userId).eq("status", "pending")
      .gt("created_at", new Date(Date.now() - 30 * 60_000).toISOString())
      .not("checkout_url", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (recent.data?.checkout_url) return { initPoint: recent.data.checkout_url };
    const { data: intent, error } = await supabaseAdmin.from("clube_hs_pix_payments")
      .insert({ user_id: context.userId }).select("id").single();
    if (error || !intent) throw new Error("Não foi possível iniciar o pagamento.");
    try {
      const result = await mercadoPagoRequest<{ id: string; init_point: string }>("/checkout/preferences", await decryptSecret(settings.access_token_encrypted), {
        method: "POST", headers: { "X-Idempotency-Key": intent.id },
        body: JSON.stringify({
          items: [{ id: "clube-hs-month", title: "Clube HS · 1 mês", quantity: 1, currency_id: "BRL", unit_price: 19.90 }],
          external_reference: `club-pix:${intent.id}`,
          notification_url: "https://hs-digital-marck.lovable.app/api/public/mercado-pago/webhook",
          back_urls: { success: `${origin}/clube-hs`, pending: `${origin}/clube-hs`, failure: `${origin}/clube-hs` },
          payment_methods: { default_payment_method_id: "pix", excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }], installments: 1 },
        }),
      });
      const saved = await supabaseAdmin.from("clube_hs_pix_payments").update({ preference_id: result.id, checkout_url: result.init_point }).eq("id", intent.id);
      if (saved.error) throw saved.error;
      return { initPoint: result.init_point };
    } catch {
      await supabaseAdmin.from("clube_hs_pix_payments").update({ status: "failed" }).eq("id", intent.id);
      throw new Error("Não foi possível abrir o Pix do Clube HS. Tente novamente.");
    }
  });
