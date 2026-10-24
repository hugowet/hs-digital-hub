import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { isSitemapRouteIncluded, sitemapPathForLocation, sitemapStaticPaths, sitemapXML, type SitemapEntry } from "@/lib/sitemap";
import { allPublicProductIds } from "@/lib/sitemap-products";
import { SITE_ORIGIN } from "@/lib/seo";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: { handlers: { GET: async () => {
    try {
      const router = await getRouterInstance();
      const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));
      const productRoute = "/produto/$productId";
      if (isSitemapRouteIncluded(router.routesById[productRoute])) {
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const url = process.env["SUPABASE_URL"];
        if (!key || !url) throw new Error("Public catalog unavailable");
        const client = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
            headers.set("apikey", key);
            return fetch(input, { ...init, headers });
          } },
        });
        const ids = await allPublicProductIds(async (offset, limit) => {
          const { data, error } = await client.from("products").select("id").eq("is_active", true)
            .order("id").range(offset, offset + limit - 1);
          if (error) throw error;
          return (data ?? []).map((row) => String(row.id));
        });
        for (const id of ids) {
          const location = router.buildLocation({ to: productRoute, params: { productId: id }, search: () => ({}), hash: "" });
          const path = sitemapPathForLocation(router, location, productRoute);
          if (path) entries.push({ path });
        }
      }
      return new Response(sitemapXML(SITE_ORIGIN, entries), {
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      });
    } catch (error) {
      console.error("Sitemap unavailable:", error instanceof Error ? error.message : "Catalog query failed");
      return new Response("Sitemap temporariamente indisponível", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  } } },
});