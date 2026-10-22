import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let {
      data: { session },
    } = await supabase.auth.getSession();

    // Se não houver sessão ou estiver a menos de 60 segundos de expirar,
    // getUser() aciona a renovação nativa com mutex do Supabase
    if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 60_000)) {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userError && userData?.user) {
          const { data: fresh } = await supabase.auth.getSession();
          session = fresh.session;
        }
      } catch (err) {
        console.warn("[AuthAttacher] Falha ao renovar token:", err);
      }
    }

    const token = session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
);
