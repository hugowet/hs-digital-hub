import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "hs-view-session";

function viewSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Registra cada página visitada (uma vez a cada 30 min por página/sessão, no banco). */
export function SiteViewTracker() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) return;
    void supabase.rpc("record_page_view", { _path: pathname, _session: viewSessionId() }).then(() => undefined, () => undefined);
  }, [pathname]);

  return null;
}
