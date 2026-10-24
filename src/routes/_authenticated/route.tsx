import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  head: () => ({ meta: [
      { name: "robots", content: "noindex, follow" },
    { title: "Minha conta · HS Digital" },
    { name: "description", content: "Compras e serviços da sua conta HS Digital." },
    { property: "og:title", content: "Minha conta · HS Digital" },
    { property: "og:description", content: "Área da conta HS Digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
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
