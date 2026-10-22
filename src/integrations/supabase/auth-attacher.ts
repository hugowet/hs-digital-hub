import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let {
      data: { session },
    } = await supabase.auth.getSession();

    // Se o token estiver expirado ou a menos de 60 segundos de expirar, renova antes do envio
    if (session?.expires_at && session.expires_at * 1000 < Date.now() + 60_000) {
      try {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (!error && refreshed?.session) {
          session = refreshed.session;
        }
      } catch (err) {
        console.warn("[AuthAttacher] Falha ao renovar sessão:", err);
      }
    }

    const token = session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
);
