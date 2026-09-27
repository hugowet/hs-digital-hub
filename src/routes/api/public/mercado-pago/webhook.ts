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
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { decryptSecret, mercadoPagoRequest, validWebhookSignature } = await import("@/lib/mercado-pago.server");
        const requestUrl = new URL(request.url);
        const rawBody = await request.text();
        let payload: Record<string, any>;
        try { payload = JSON.parse(rawBody); } catch { return new Response("Invalid JSON", { status: 400 }); }
        const eventData = payload["data"] as { id?: string | number } | undefined;
        const dataId = String(eventData?.id ?? requestUrl.searchParams.get("data.id") ?? "");
        const eventType = String(payload["type"] ?? requestUrl.searchParams.get("type") ?? "");
        if (!dataId || !eventType.includes("payment")) return new Response("Ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: settings } = await supabaseAdmin
          .from("payment_provider_settings")
          .select("webhook_secret_encrypted")
          .eq("provider", "mercadopago")
          .maybeSingle();
        if (!settings) return new Response("Not configured", { status: 503 });
        const webhookSecret = await decryptSecret(settings.webhook_secret_encrypted);
        const signature = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";
        const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=")));
        if (!parts.ts || !parts.v1 || !requestId || !await validWebhookSignature(dataId, requestId, parts.ts, parts.v1, webhookSecret)) {
          return new Response("Invalid signature", { status: 401 });
        }

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

        const { data: transaction } = await supabaseAdmin
          .from("payment_transactions")
          .select("id,store_id")
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
        await supabaseAdmin.from("payment_events").update({ processed_at: new Date().toISOString() })
          .eq("provider", "mercadopago").eq("provider_event_id", providerEventId);
        return new Response("ok");
      },
    },
  },
});