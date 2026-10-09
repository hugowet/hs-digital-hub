import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const returnUrl = location.pathname + (location.searchStr ? `?${location.searchStr}` : "");
      throw redirect({
        to: "/auth",
        search: { reason: "login-required", redirect: returnUrl },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
