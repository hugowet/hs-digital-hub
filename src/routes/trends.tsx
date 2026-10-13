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
    ],
  }),
  component: TrendsPage,
});

function TrendsPage() {
  return <HSTrends />;
}
