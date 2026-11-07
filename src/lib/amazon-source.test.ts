import { describe, expect, it } from "vitest";
import { amazonSourceMetadata, amazonSourceUrl } from "./amazon-source";

describe("Amazon import source retention", () => {
  it("keeps the original link and selected ASIN independently of affiliate tagging", () => {
    const original = "https://www.amazon.com.br/gp/product/B0HPXF119V?tag=original&th=1";
    expect(amazonSourceMetadata(original)).toEqual({
      affiliate_original_url: original,
      affiliate_product_url: "https://www.amazon.com.br/dp/B0HPXF119V",
      affiliate_url: "https://www.amazon.com.br/dp/B0HPXF119V?tag=hsdigitalst0c-20",
      asin: "B0HPXF119V",
    });
  });
  it("retains short links but uses the verified selected product for future rereads", () => {
    const metadata = amazonSourceMetadata("https://amzn.to/example", "B0HPXF1QLP");
    expect(metadata.affiliate_original_url).toBe("https://amzn.to/example");
    expect(amazonSourceUrl(metadata)).toBe("https://www.amazon.com.br/dp/B0HPXF1QLP");
  });
  it("does not invent a selected identity for unresolved short links", () => {
    expect(amazonSourceMetadata("https://amzn.to/example").asin).toBeUndefined();
    expect(amazonSourceUrl({ affiliate_original_url: "https://amzn.to/example" })).toBe("");
  });
  it("rejects conflicting selected identities", () => {
    expect(() => amazonSourceMetadata("https://amazon.com.br/dp/B0HPXF119V", "B0HPXF1QLP")).toThrow();
  });
  it("preserves legacy rereads and rejects unsafe source addresses", () => {
    expect(amazonSourceUrl({ affiliate_url: "https://amazon.com.br/dp/B0HPXF119V?tag=legacy" })).toBe("https://www.amazon.com.br/dp/B0HPXF119V");
    expect(amazonSourceUrl({ affiliate_product_url: "https://localhost/dp/B0HPXF119V" })).toBe("");
  });
});