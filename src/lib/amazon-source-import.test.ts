import { afterEach, expect, it, vi } from "vitest";
vi.mock("./amazon.functions", () => ({
  extractDescription: () => "Descrição oficial do produto",
  extractSpecs: () => ({ Marca: "Original" }),
}));
import { runAmazonAutoImport } from "./amazon-auto.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("persists the source on the robot's inserted product with its real color-photo mapping", async () => {
  vi.stubEnv("LOVABLE_API_KEY", "test-only");
  vi.stubEnv("FIRECRAWL_API_KEY", "test-only");
  const image = "https://m.media-amazon.com/images/I/black-shirt.jpg";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: {
    json: { title: "Camiseta", price: 30, images: [image] },
    rawHtml: `<div id="variation_color_name"><li data-asin="B0HPXF119V" title="Preto"><img alt="Preto" src="${image}"></li></div>`,
  } })));
  const insert = vi.fn().mockResolvedValue({ error: null });
  const db = { from: vi.fn(() => ({
    select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
    insert,
  })) };
  const result = await runAmazonAutoImport(db, "store-test", 0, {
    pending: [{ url: "https://www.amazon.com.br/dp/B0HPXF119V", title: "Camiseta", rating: 4.8, reviews: 1200, badge: "", fulfilledByAmazon: true }],
    nextAllowedAt: 0,
  });
  expect(result.published).toBe(1);
  const product = insert.mock.calls[0]?.[0]?.[0];
  expect(product?.specifications.affiliate_original_url).toBe("https://www.amazon.com.br/dp/B0HPXF119V");
  expect(product?.specifications.affiliate_product_url).toBe("https://www.amazon.com.br/dp/B0HPXF119V");
  expect(product?.specifications.asin).toBe("B0HPXF119V");
  expect(product?.variations.find((g: { name: string }) => g.name === "Cor")?.images.Preto).toBe(image);
});