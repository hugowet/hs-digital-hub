import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[], paths: [] as string[],
  product: {} as Record<string, unknown>,
}));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { inputValidator: () => builder, handler: (handler: (args: unknown) => unknown) => handler };
  return builder;
}, createServerOnlyFn: (fn: unknown) => fn }));
vi.mock("@tanstack/start-server-core", () => ({ createSsrRpc: () => (args: unknown) => import("./catalog.functions").then(module => module.fetchProduct.__executeServer(args)) }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ in: () => ({ order: async () => ({ data: mocks.rows }) }) }) }),
    storage: { from: () => ({ createSignedUrls: async (paths: string[]) => {
      mocks.paths = paths;
      return { data: paths.map(path => ({ signedUrl: `https://photos.example.test/${path}` })) };
    } }) },
  },
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({
  from: () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: mocks.product }) };
    return query;
  },
}) }));
import { fetchProduct } from "./catalog.functions";

describe("manual product private photos", () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.paths = [];
    mocks.product = { id: "dd9e5cf6-69e3-4551-8e5f-e3082ba5ea3c", store_id: "store", image_url: "store/cover.jpg", gallery_urls: ["store/side.jpg"], variations: [{ name: "Cor", options: ["Branco"], images: { Branco: "store/white.jpg" } }] };
  });
  it("signs the cover even without a product_media record", async () => {
    const result = await fetchProduct({ data: { productId: String(mocks.product.id) } });
    expect(result?.image_url).toBe("https://photos.example.test/store/cover.jpg");
    expect(mocks.paths).toContain("store/cover.jpg");
  });
  it("signs legacy gallery and explicitly linked color photos", async () => {
    const result = await fetchProduct({ data: { productId: String(mocks.product.id) } });
    expect(result?.gallery_urls).toEqual(["https://photos.example.test/store/side.jpg"]);
    expect(result?.variations[0]?.images?.Branco).toBe("https://photos.example.test/store/white.jpg");
  });
});