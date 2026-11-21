import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { recordSiteView } from "@/lib/page-view.functions";

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
    void recordSiteView({ data: { path: pathname, session: viewSessionId() } }).then(() => undefined, () => undefined);
  }, [pathname]);

  return null;
}
