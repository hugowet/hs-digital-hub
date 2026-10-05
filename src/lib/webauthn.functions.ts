import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const responseSchema = z.object({
  challengeId: z.string().uuid(),
  response: z.unknown(),
  nickname: z.string().trim().min(1).max(80).optional(),
});
const challengeSchema = z.object({ challengeId: z.string().uuid(), response: z.unknown() });

function rpConfig() {
  const request = getRequest();
  const configured = process.env["WEBAUTHN_ORIGIN"];
  const origin = configured || new URL(request.url).origin;
  const rpID = process.env["WEBAUTHN_RP_ID"] || new URL(origin).hostname;
  return { origin, rpID };
}

export const beginPasskeyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ generateRegistrationOptions }, { supabaseAdmin }] = await Promise.all([
      import("@simplewebauthn/server"),
      import("@/integrations/supabase/client.server"),
    ]);
    const { data: existing } = await supabaseAdmin
      .from("webauthn_credentials")
      .select("credential_id,transports")
      .eq("user_id", context.userId)
      .is("revoked_at", null);
    if ((existing?.length ?? 0) >= 10)
      throw new Error("Limite de dispositivos biométricos atingido.");
    const { origin, rpID } = rpConfig();
    const options = await generateRegistrationOptions({
      rpName: "HS Digital",
      rpID,
      userName: String(context.claims.email ?? context.userId),
      userDisplayName: String(context.claims.email ?? "Cliente HS Digital"),
      userID: new TextEncoder().encode(context.userId),
      attestationType: "none",
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      excludeCredentials: (existing ?? []).map((item) => ({
        id: item.credential_id,
        transports: item.transports ?? [],
      })),
    });
    const { data: challenge, error } = await supabaseAdmin
      .from("webauthn_challenges")
      .insert({
        user_id: context.userId,
        challenge: options.challenge,
        challenge_type: "registration",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { challengeId: challenge.id, optionsJSON: JSON.stringify(options), origin };
  });

export const completePasskeyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => responseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const [{ verifyRegistrationResponse }, { isoBase64URL }, { supabaseAdmin }] = await Promise.all(
      [
        import("@simplewebauthn/server"),
        import("@simplewebauthn/server/helpers"),
        import("@/integrations/supabase/client.server"),
      ],
    );
    const { data: challenge } = await supabaseAdmin
      .from("webauthn_challenges")
      .delete()
      .eq("id", data.challengeId)
      .eq("user_id", context.userId)
      .eq("challenge_type", "registration")
      .gt("expires_at", new Date().toISOString())
      .select("challenge")
      .maybeSingle();
    if (!challenge) throw new Error("O cadastro expirou. Tente novamente.");
    const { origin, rpID } = rpConfig();
    const verification = await verifyRegistrationResponse({
      response: data.response as never,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verification.verified) throw new Error("Não foi possível validar este dispositivo.");
    const info = verification.registrationInfo;
    const { error } = await supabaseAdmin.from("webauthn_credentials").insert({
      user_id: context.userId,
      credential_id: info.credential.id,
      public_key: isoBase64URL.fromBuffer(info.credential.publicKey),
      counter: info.credential.counter,
      transports: info.credential.transports ?? [],
      device_type: info.credentialDeviceType,
      backed_up: info.credentialBackedUp,
      nickname: data.nickname || "Biometria deste aparelho",
    });
    if (error) throw error;
    return { ok: true };
  });

export const beginPasskeyLogin = createServerFn({ method: "POST" }).handler(async () => {
  const [{ generateAuthenticationOptions }, { supabaseAdmin }] = await Promise.all([
    import("@simplewebauthn/server"),
    import("@/integrations/supabase/client.server"),
  ]);
  const { rpID } = rpConfig();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  const { data, error } = await supabaseAdmin
    .from("webauthn_challenges")
    .insert({ challenge: options.challenge, challenge_type: "authentication" })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível iniciar a entrada biométrica.");
  return { challengeId: data.id, optionsJSON: JSON.stringify(options) };
});

export const completePasskeyLogin = createServerFn({ method: "POST" })
  .inputValidator((input) => challengeSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const [{ verifyAuthenticationResponse }, { isoBase64URL }, { supabaseAdmin }] =
        await Promise.all([
          import("@simplewebauthn/server"),
          import("@simplewebauthn/server/helpers"),
          import("@/integrations/supabase/client.server"),
        ]);
      const { data: challenge } = await supabaseAdmin
        .from("webauthn_challenges")
        .delete()
        .eq("id", data.challengeId)
        .eq("challenge_type", "authentication")
        .gt("expires_at", new Date().toISOString())
        .select("challenge")
        .maybeSingle();
      const response = data.response as { id?: string };
      if (!challenge || !response.id) throw new Error();
      const { data: credential } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("*")
        .eq("credential_id", response.id)
        .is("revoked_at", null)
        .maybeSingle();
      if (!credential) throw new Error();
      const { origin, rpID } = rpConfig();
      const verified = await verifyAuthenticationResponse({
        response: data.response as never,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credential.credential_id,
          publicKey: isoBase64URL.toBuffer(credential.public_key),
          counter: Number(credential.counter),
          transports: credential.transports,
        },
        requireUserVerification: true,
      });
      if (!verified.verified) throw new Error();
      await supabaseAdmin
        .from("webauthn_credentials")
        .update({
          counter: verified.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", credential.id);
      const { data: userResult } = await supabaseAdmin.auth.admin.getUserById(credential.user_id);
      if (!userResult.user?.email) throw new Error();
      const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userResult.user.email,
      });
      if (linkError) throw linkError;
      const url = process.env["SUPABASE_URL"]!;
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: sessionResult, error: sessionError } = await client.auth.verifyOtp({
        token_hash: link.properties.hashed_token,
        type: "magiclink",
      });
      if (sessionError || !sessionResult.session) throw sessionError ?? new Error();
      return {
        accessToken: sessionResult.session.access_token,
        refreshToken: sessionResult.session.refresh_token,
      };
    } catch {
      throw new Error("Não foi possível entrar com a biometria deste aparelho.");
    }
  });

export const revokePasskey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("webauthn_credentials")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
