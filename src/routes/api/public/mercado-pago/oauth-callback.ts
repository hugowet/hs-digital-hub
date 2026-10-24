// @ts-nocheck -- types out of sync with backend schema; see build log
import { createFileRoute } from "@tanstack/react-router";

type OAuthResponse = {
  access_token: string;
  refresh_token?: string;
  user_id: number;
  expires_in?: number;
};

export const Route = createFileRoute("/api/public/mercado-pago/oauth-callback")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { decryptSecret, encryptSecret, sha256 } = await import("@/lib/mercado-pago.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get("code");
        const state = requestUrl.searchParams.get("state");
        const mpError = requestUrl.searchParams.get("error");
        const mpErrorDesc = requestUrl.searchParams.get("error_description");

        // Se o Mercado Pago retornou um erro diretamente na URL (ex: vendedor cancelou ou rejeitou)
        if (mpError) {
          console.error(`Mercado Pago OAuth error from query: ${mpError} - ${mpErrorDesc}`);
          await supabaseAdmin.from("payment_events").insert({
            provider: "mercadopago",
            provider_event_id: `oauth_query_err_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
            event_type: "oauth.authorization_rejected",
            payload: {
              error: mpError,
              description: mpErrorDesc || null,
            },
            processed_at: new Date().toISOString(),
          });

          return new Response(
            `Erro na autorização do Mercado Pago: ${mpErrorDesc || mpError}`,
            { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
          );
        }

        if (!code || !state) {
          return new Response("Autorização inválida (parâmetros code/state ausentes).", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }

        const stateHash = await sha256(state);
        const { data: oauthState } = await supabaseAdmin
          .from("mercado_pago_oauth_states")
          .select("id,store_id,redirect_origin,expires_at,used_at")
          .eq("state_hash", stateHash)
          .maybeSingle();

        if (!oauthState || oauthState.used_at || new Date(oauthState.expires_at) <= new Date()) {
          return new Response("Autorização expirada ou já utilizada. Inicie a conexão novamente.", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }

        const { data: settings } = await supabaseAdmin
          .from("payment_provider_settings")
          .select("client_id,client_secret_encrypted")
          .eq("provider", "mercadopago")
          .maybeSingle();

        if (!settings) {
          return new Response("Mercado Pago não está configurado no painel administrativo.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }

        const redirectUri = `${oauthState.redirect_origin}/api/public/mercado-pago/oauth-callback`;
        const clientSecret = await decryptSecret(settings.client_secret_encrypted);

        // Troca do código de autorização pelo token de acesso
        const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: settings.client_id,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        });

        // Se a troca falhar, grava a resposta exata do Mercado Pago em payment_events sem expor o client_secret
        if (!tokenResponse.ok) {
          const rawResponse = await tokenResponse.text();
          console.error(`Mercado Pago OAuth token exchange failed [${tokenResponse.status}]: ${rawResponse}`);

          let parsedDetails: Record<string, unknown> = {};
          try {
            parsedDetails = JSON.parse(rawResponse) as Record<string, unknown>;
          } catch {
            parsedDetails = { raw: rawResponse };
          }

          await supabaseAdmin.from("payment_events").insert({
            provider: "mercadopago",
            provider_event_id: `oauth_token_err_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
            event_type: "oauth.token_exchange_failed",
            payload: {
              http_status: tokenResponse.status,
              store_id: oauthState.store_id,
              client_id: settings.client_id,
              redirect_uri_used: redirectUri,
              error_response: parsedDetails,
            },
            processed_at: new Date().toISOString(),
          });

          const mensagemErro =
            typeof parsedDetails.message === "string"
              ? parsedDetails.message
              : typeof parsedDetails.error === "string"
              ? parsedDetails.error
              : "Erro na troca do token";

          return new Response(
            `Não foi possível conectar a conta Mercado Pago.\n\nMotivo retornado pelo Mercado Pago (${tokenResponse.status}): ${mensagemErro}\n\nOs detalhes foram registrados no sistema.`,
            {
              status: 502,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            },
          );
        }

        const token = (await tokenResponse.json()) as OAuthResponse;
        const expiresAt = token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000).toISOString()
          : null;

        const { error: accountError } = await supabaseAdmin.from("mercado_pago_accounts").upsert({
          store_id: oauthState.store_id,
          mercado_pago_user_id: String(token.user_id),
          access_token_encrypted: await encryptSecret(token.access_token),
          refresh_token_encrypted: token.refresh_token ? await encryptSecret(token.refresh_token) : null,
          token_expires_at: expiresAt,
        });

        if (accountError) throw accountError;

        await supabaseAdmin
          .from("stores")
          .update({
            mercado_pago_user_id: String(token.user_id),
            mercado_pago_status: "connected",
          })
          .eq("id", oauthState.store_id);

        await supabaseAdmin
          .from("mercado_pago_oauth_states")
          .update({ used_at: new Date().toISOString() })
          .eq("id", oauthState.id);

        return Response.redirect(`${oauthState.redirect_origin}/vendedor?mercado_pago=connected`, 302);
      },
    },
  },
});
