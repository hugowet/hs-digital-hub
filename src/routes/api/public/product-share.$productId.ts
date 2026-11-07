import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/product-share/$productId")({
  server: { handlers: { GET: async ({ params }) => {
    const id = z.string().uuid().safeParse(params.productId);
    if (!id.success) return new Response("Not found", { status: 404 });
    const { productShareImage } = await import("@/lib/product-share-image.server");
    try { return await productShareImage(id.data); }
    catch { return new Response("Image unavailable", { status: 503 }); }
  } } },
});