import { createFileRoute } from "@tanstack/react-router";
import { RadioHS } from "@/pages/RadioHS";

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Rádio HS Digital 🎵 · Ao Vivo" },
      {
        name: "description",
        content: "Ouça a programação oficial da HS Digital com reprodução contínua em segundo plano.",
      },
    ],
  }),
  component: RadioHS,
});
