import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/radio-hs")({
  staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/radio", replace: true }); },
  head: () => ({ meta: [
    { title: "Rádio HS · Estações ao vivo" },
    { name: "description", content: "Ouça as estações ao vivo na HS Digital." },
    { property: "og:title", content: "Rádio HS · Estações ao vivo" },
    { property: "og:description", content: "Ouça as estações ao vivo na HS Digital." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});
