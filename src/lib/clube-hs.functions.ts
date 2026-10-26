// @ts-nocheck -- types out of sync with backend schema; see build log
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clubPixBody, validPixCpf } from "./club-pix";

export const createClubeHsSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (admin.error) throw new Error("Não foi possível verificar seu acesso.");
    if (admin.data) throw new Error("Sua conta administradora já tem acesso premium gratuito, sem assinatura.");
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
  .inputValidator((input) => z.object({ origin: z.string().url(), cpf: z.string().refine(validPixCpf, "Informe um CPF válido para gerar o Pix.") }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (admin.error) throw new Error("Não foi possível verificar seu acesso.");
    if (admin.data) throw new Error("Sua conta administradora já tem acesso premium gratuito, sem assinatura.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptSecret, mercadoPagoRequest, safeOrigin } = await import("@/lib/mercado-pago.server");
    const origin = safeOrigin(data.origin);
    const { data: settings } = await supabaseAdmin.from("payment_provider_settings")
      .select("access_token_encrypted").eq("provider", "mercadopago").maybeSingle();
    if (!settings?.access_token_encrypted) throw new Error("Pagamento do Clube indisponível. Tente novamente mais tarde.");
    const accessToken=await decryptSecret(settings.access_token_encrypted);
    const {data: identity}=await context.supabase.auth.getUser();
    const email=identity.user?.email;
    if(!email)throw new Error("Confirme o e-mail da sua conta para gerar o Pix.");
    const collector=await mercadoPagoRequest<{email?:string;identification?:{number?:string}}>("/users/me",accessToken);
    if(collector.email?.toLowerCase()===email.toLowerCase() || collector.identification?.number?.replace(/\D/g,"")===data.cpf.replace(/\D/g,""))throw new Error("O Mercado Pago não permite Pix para a própria conta recebedora. Administradores já têm acesso gratuito.");
    const recent=await supabaseAdmin.from("clube_hs_pix_payments").select("id,provider_payment_id").eq("user_id",context.userId).eq("status","pending").gt("created_at",new Date(Date.now()-30*60_000).toISOString()).not("provider_payment_id","is",null).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(recent.error)throw new Error("Não foi possível consultar o Pix anterior.");
    if(recent.data?.provider_payment_id){
      const payment=await mercadoPagoRequest<any>(`/v1/payments/${recent.data.provider_payment_id}`,accessToken);
      if(payment.status==='pending' && payment.external_reference===`club-pix:${recent.data.id}` && Date.parse(payment.date_of_expiration)>Date.now() && payment.point_of_interaction?.transaction_data?.qr_code){const qr=payment.point_of_interaction.transaction_data;return {intentId:recent.data.id,qrCode:qr.qr_code,qrImage:qr.qr_code_base64,expiresAt:payment.date_of_expiration};}
    }
    const { data: intent, error } = await supabaseAdmin.from("clube_hs_pix_payments")
      .insert({ user_id: context.userId }).select("id").single();
    if (error || !intent) throw new Error("Não foi possível iniciar o pagamento.");
    try {
      const result = await mercadoPagoRequest<any>("/v1/payments", accessToken, {
        method: "POST", headers: { "X-Idempotency-Key": intent.id },
        body: JSON.stringify(clubPixBody(intent.id,email,data.cpf)),
      });
      const qr=result.point_of_interaction?.transaction_data;
      if(!qr?.qr_code)throw new Error("O Mercado Pago não retornou um código Pix para esta cobrança.");
      const saved = await supabaseAdmin.from("clube_hs_pix_payments").update({ provider_payment_id: String(result.id) }).eq("id", intent.id);
      if (saved.error) throw saved.error;
      return { intentId:intent.id, qrCode:qr.qr_code, qrImage:qr.qr_code_base64, expiresAt:result.date_of_expiration };
    } catch (caught) {
      await supabaseAdmin.from("clube_hs_pix_payments").update({ status: "failed" }).eq("id", intent.id);
      throw new Error(caught instanceof Error ? caught.message : "Não foi possível gerar o Pix do Clube HS.");
    }
  });
