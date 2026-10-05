import { createFileRoute } from "@tanstack/react-router";

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number };

export const Route = createFileRoute("/api/public/melhor-envio/oauth-callback")({
  server: { handlers: { GET: async ({ request }) => {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    if (!code || !state) return new Response("Autorização inválida.", { status: 400 });
    const clientId = process.env["MELHOR_ENVIO_CLIENT_ID"];
    const clientSecret = process.env["MELHOR_ENVIO_CLIENT_SECRET"];
    if (!clientId || !clientSecret) return new Response("Melhor Envio não configurado.", { status: 503 });

    const { sha256, encryptSecret } = await import("@/lib/mercado-pago.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integration } = await supabaseAdmin.from("seller_shipping_integrations")
      .select("id,redirect_origin,oauth_state_expires_at").eq("provider", "melhor_envio")
      .eq("oauth_state_hash", await sha256(state)).maybeSingle();
    if (!integration?.redirect_origin || !integration.oauth_state_expires_at || new Date(integration.oauth_state_expires_at) <= new Date()) {
      return new Response("Autorização expirada.", { status: 400 });
    }
    const redirectUri = `${integration.redirect_origin}/api/public/melhor-envio/oauth-callback`;
    const tokenResponse = await fetch("https://melhorenvio.com.br/oauth/token", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }),
      signal: AbortSignal.timeout(20_000),
    });
    const token = (await tokenResponse.json()) as TokenResponse;
    if (!tokenResponse.ok || !token.access_token) {
      await supabaseAdmin.from("seller_shipping_integrations").update({ status: "error", last_error: "O Melhor Envio recusou a conexão." }).eq("id", integration.id);
      return new Response("Não foi possível conectar o Melhor Envio.", { status: 502 });
    }
    const { error } = await supabaseAdmin.from("seller_shipping_integrations").update({
      status: "active", access_token_encrypted: await encryptSecret(token.access_token),
      refresh_token_encrypted: token.refresh_token ? await encryptSecret(token.refresh_token) : null,
      token_expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      oauth_state_hash: null, oauth_state_expires_at: null, last_error: null,
    }).eq("id", integration.id);
    if (error) throw error;
    return Response.redirect(`${integration.redirect_origin}/vendedor?melhor_envio=connected`, 302);
  } } },
});