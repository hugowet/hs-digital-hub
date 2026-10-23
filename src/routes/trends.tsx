import { createFileRoute } from "@tanstack/react-router";
import { HSTrends } from "@/components/HSTrends";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "HSTrends 🎬 · Vídeos e Ofertas Verticais" },
      {
        name: "description",
        content: "Assista a vídeos, unboxings e feedbacks no feed vertical HSTrends da HS Digital.",
      },
      { property: "og:title", content: "HSTrends 🎬 · Vídeos e Ofertas Verticais" },
      { property: "og:description", content: "Assista a vídeos, unboxings e feedbacks no feed vertical HSTrends da HS Digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrendsPage,
});

function TrendsPage() {
  return <HSTrends />;
}
