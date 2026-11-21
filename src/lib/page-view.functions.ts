import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { classifyAudienceDevice, audienceLocation } from "./audience-device";

const input = z.object({ path: z.string().max(200), session: z.string().min(8).max(64) });

export const recordSiteView = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ data }) => {
    const request = getRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    let userId: string | null = null;
    if (token) {
      const { data: user } = await supabaseAdmin.auth.getUser(token);
      userId = user.user?.id ?? null;
    }
    const cf = (request as Request & { cf?: Record<string, unknown> }).cf ?? {};
    const place = audienceLocation(cf);
    const { error } = await supabaseAdmin.rpc("record_page_view_details", {
      _path: data.path,
      _session: data.session,
      _user_id: userId as string,
      _country: place.country as string,
      _city: place.city as string,
      _region: place.region as string,
      _device: classifyAudienceDevice(request.headers.get("user-agent")),
    });
    if (error) throw new Error("Não foi possível registrar a visita.");
    return { ok: true };
  });
