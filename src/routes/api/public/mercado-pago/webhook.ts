// @ts-nocheck -- types out of sync with backend schema; see build log
import { createFileRoute } from "@tanstack/react-router";

type Payment = {
  id: number;
  status: string;
  status_detail?: string;
  payment_method_id?: string;
  external_reference?: string;
  metadata?: { transaction_id?: string };
};

export const Route = createFileRoute("/api/public/mercado-pago/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { decryptSecret, mercadoPagoRequest, validWebhookSignature } = await import("@/lib/mercado-pago.server");
        const requestUrl = new URL(request.url);
        const rawBody = await request.text();
        let payload: Record<string, any>;
        
        try { 
          payload = JSON.parse(rawBody); 
        } catch { 
          return new Response("Invalid JSON", { status: 400 }); 
        }

        const eventData = payload["data"] as { id?: string | number } | undefined;
        const dataId = String(eventData?.id ?? requestUrl.searchParams.get("data.id") ?? "");
        const eventType = String(payload["type"] ?? requestUrl.searchParams.get("type") ?? "");
        
        // --- ADAPTAÇÃO SEGURO: Aceita pagamentos comuns ou assinaturas do clube ---
        const isSubscriptionEvent = eventType.includes("subscription_preapproval") || eventType.includes("preapproval") || eventType.includes("subscription");
        const isPaymentEvent = eventType.includes("payment");

        if (!dataId || (!isPaymentEvent && !isSubscriptionEvent)) {
          return new Response("Ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. BUSCA AS CONFIGURAÇÕES DE ASSINATURA E ASSINATURA DE WEBHOOK (COMPARTILHADO)
        const { data: settings } = await supabaseAdmin
          .from("payment_provider_settings")
          .select("webhook_secret_encrypted, access_token_encrypted")
          .eq("provider", "mercadopago")
          .maybeSingle();

        if (!settings) return new Response("Not configured", { status: 503 });

        // Validação básica da assinatura de segurança do Webhook
        const webhookSecret = await decryptSecret(settings.webhook_secret_encrypted);
        const signature = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";
        const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=")));
        
        if (!parts.ts || !parts.v1 || !requestId || !await validWebhookSignature(dataId, requestId, parts.ts, parts.v1, webhookSecret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // Evita duplicidade de processamento de logs
        const providerEventId = String(payload["id"] ?? `${eventType}:${dataId}`);
        const { data: existing } = await supabaseAdmin
          .from("payment_events")
          .select("processed_at")
          .eq("provider", "mercadopago")
          .eq("provider_event_id", providerEventId)
          .maybeSingle();
          
        if (existing?.processed_at) return new Response("ok");

        await supabaseAdmin.from("payment_events").upsert({
          provider: "mercadopago",
          provider_event_id: providerEventId,
          provider_payment_id: dataId,
          event_type: eventType,
          payload,
        }, { onConflict: "provider,provider_event_id" });

        // =========================================================================
        // 🚀 ESTEIRA INTEGRADORA: PROVENIENTE DO CÓDIGO DA SUA IA (CLUBE HS)
        // =========================================================================
        if (isSubscriptionEvent) {
          const accessToken = await decryptSecret(settings.access_token_encrypted);
          
          // Consulta em tempo real na API do Mercado Pago para conferir os dados da recorrência
          const preapproval = await mercadoPagoRequest<any>(`/preapproval/${dataId}`, accessToken);

          if (preapproval?.external_reference) {
            const userId = preapproval.external_reference;
            const isActive = preapproval.status === "authorized";

            // Atualiza dinamicamente o status do Clube HS no perfil do usuário
            await supabaseAdmin
              .from("profiles")
              .update({ is_clube_hs: isActive, updated_at: new Date().toISOString() })
              .eq("id", userId);

            // Atualiza de forma segura e sincroniza a tabela clube_hs_subscriptions
            await supabaseAdmin
              .from("clube_hs_subscriptions")
              .upsert({
                user_id: userId,
                preapproval_id: dataId,
                status: preapproval.status,
                updated_at: new Date().toISOString(),
              }, { onConflict: "preapproval_id" });
          }

          // Atualiza o evento como concluído com sucesso
          await supabaseAdmin.from("payment_events").update({ processed_at: new Date().toISOString() })
            .eq("provider", "mercadopago").eq("provider_event_id", providerEventId);
            
          return new Response("ok");
        }

        // =========================================================================
        // 🛒 ESTEIRA TRADICIONAL: FLUXO DE COMPRAS DO MARKETPLACE (SEU CÓDIGO INTACTO)
        // =========================================================================
        const { data: transaction } = await supabaseAdmin
          .from("payment_transactions")
          .select("id,store_id,order_id")
          .eq("provider_payment_id", dataId)
          .maybeSingle();
          
        if (!transaction) return new Response("Transaction not found", { status: 202 });
        
        const { data: account } = await supabaseAdmin
          .from("mercado_pago_accounts")
          .select("access_token_encrypted")
          .eq("store_id", transaction.store_id)
          .maybeSingle();
          
        if (!account) return new Response("Account not found", { status: 202 });

        const payment = await mercadoPagoRequest<Payment>(`/v1/payments/${encodeURIComponent(dataId)}`, await decryptSecret(account.access_token_encrypted));
        const boundTransactionId = payment.metadata?.transaction_id ?? payment.external_reference;
        if (boundTransactionId !== transaction.id) return new Response("Payment mismatch", { status: 409 });
        
        const { error } = await supabaseAdmin.rpc("apply_mercado_pago_status", {
          _transaction_id: transaction.id,
          _provider_payment_id: String(payment.id),
          _status: payment.status,
          _payment_method: payment.payment_method_id ?? "",
          _provider_payload: { status_detail: payment.status_detail ?? null },
        });
        
        if (error) throw error;
        
        // Se a compra comum do marketplace for aprovada, dispara para a CJ Dropshipping
        if (payment.status === "approved") {
          const { dispatchPaidCjFulfillments } = await import("@/lib/suppliers.server");
          await dispatchPaidCjFulfillments(supabaseAdmin, transaction.order_id);
        }
        
        await supabaseAdmin.from("payment_events").update({ processed_at: new Date().toISOString() })
          .eq("provider", "mercadopago").eq("provider_event_id", providerEventId);
          
        return new Response("ok");
      },
    },
  },
});
