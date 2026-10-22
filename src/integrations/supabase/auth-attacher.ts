import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

// Promessa compartilhada para evitar que requisições concorrentes
// disparem múltiplos refreshSession() ao mesmo tempo no Supabase
let refreshPromise: Promise<string | null> | null = null;

async function getValidAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  // Se o token ainda for válido por mais de 60 segundos, usa diretamente
  const isExpiringSoon = session.expires_at
    ? session.expires_at * 1000 < Date.now() + 60_000
    : false;

  if (!isExpiringSoon && session.access_token) {
    return session.access_token;
  }

  // Se estiver vencido ou quase vencendo, renova de forma protegida contra concorrência
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          console.warn("[AuthAttacher] Sessão expirada ou revogada:", error?.message);
          return null;
        }
        return data.session.access_token;
      } catch (err) {
        console.warn("[AuthAttacher] Falha ao renovar sessão:", err);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getValidAccessToken();

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
);
