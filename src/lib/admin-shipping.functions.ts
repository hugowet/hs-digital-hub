import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";

export const setProductShippingAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ productId: z.string().uuid(), freeShipping: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    // Revalidate the live session, not only the JWT claims or browser state.
    const session = await context.supabase.auth.getUser();
    if (session.error || !session.data.user || session.data.user.id !== context.userId) {
      throw new Response("Unauthorized", { status: 401 });
    }
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || role.data !== true) {
      throw new Response("Forbidden", { status: 403 });
    }
    // Privileged access is loaded only after identity and protected role checks.
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products")
      .update({ free_shipping: data.freeShipping }).eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const setAllProductsShippingAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ freeShipping: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const session = await context.supabase.auth.getUser();
    if (session.error || !session.data.user || session.data.user.id !== context.userId) {
      throw new Response("Unauthorized", { status: 401 });
    }
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || role.data !== true) {
      throw new Response("Forbidden", { status: 403 });
    }
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products")
      .update({ free_shipping: data.freeShipping }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);
    return { success: true };
  });