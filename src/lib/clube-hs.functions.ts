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

    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", context.userId)
      .maybeSingle();

    const payerEmail = userProfile?.email || "cliente@hsdigital.com";

    // Criar Preapproval Plan / Subscription no Mercado Pago
    // Valor: R$ 19,90 por mês
    const preapprovalPayload = {
      reason: "Clube HS - Assinatura Mensal (Região Perdizes)",
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
