import { createFileRoute } from "@tanstack/react-router";

import { decryptSecret, encryptSecret, mercadoPagoRequest, sha256 } from "@/lib/mercado-pago.server";

type OAuthResponse = {
  access_token: string;
  refresh_token?: string;
  user_id: number;
  expires_in?: number;
};

export const Route = createFileRoute("/api/public/mercado-pago/oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get("code");
        const state = requestUrl.searchParams.get("state");
        if (!code || !state) return new Response("Autorização inválida.", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const stateHash = await sha256(state);
        const { data: oauthState } = await supabaseAdmin
          .from("mercado_pago_oauth_states")
          .select("id,store_id,redirect_origin,expires_at,used_at")
          .eq("state_hash", stateHash)
          .maybeSingle();
        if (!oauthState || oauthState.used_at || new Date(oauthState.expires_at) <= new Date()) {
          return new Response("Autorização expirada ou já utilizada.", { status: 400 });
        }
        const { data: settings } = await supabaseAdmin
          .from("payment_provider_settings")
          .select("client_id,client_secret_encrypted")
          .eq("provider", "mercadopago")
          .maybeSingle();
        if (!settings) return new Response("Mercado Pago não configurado.", { status: 503 });

        const redirectUri = `${oauthState.redirect_origin}/api/public/mercado-pago/oauth-callback`;
        const token = await mercadoPagoRequest<OAuthResponse>("/oauth/token", await decryptSecret(settings.client_secret_encrypted), {
          method: "POST",
          body: JSON.stringify({
            client_id: settings.client_id,
            client_secret: await decryptSecret(settings.client_secret_encrypted),
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        });
        const expiresAt = token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000).toISOString()
          : null;
        const { error } = await supabaseAdmin.from("mercado_pago_accounts").upsert({
          store_id: oauthState.store_id,
          mercado_pago_user_id: String(token.user_id),
          access_token_encrypted: await encryptSecret(token.access_token),
          refresh_token_encrypted: token.refresh_token ? await encryptSecret(token.refresh_token) : null,
          token_expires_at: expiresAt,
        });
        if (error) throw error;
        await supabaseAdmin.from("stores").update({
          mercado_pago_user_id: String(token.user_id),
          mercado_pago_status: "connected",
        }).eq("id", oauthState.store_id);
        await supabaseAdmin.from("mercado_pago_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", oauthState.id);
        return Response.redirect(`${oauthState.redirect_origin}/vendedor?mercado_pago=connected`, 302);
      },
    },
  },
});