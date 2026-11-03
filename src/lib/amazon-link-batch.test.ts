import { describe, expect, it, vi } from "vitest";
import { parseAmazonLinkBatch, readAmazonLinkBatch, validateAmazonProductUrl } from "./amazon-link-batch";

describe("Amazon link staging", () => {
  it("accepts 50 links and refuses 51", () => {
    const links = Array.from({ length: 51 }, (_, i) => `https://amazon.com.br/dp/${String(i).padStart(10, "0")}`);
    expect(parseAmazonLinkBatch(links.slice(0, 50).join("\n"))).toHaveLength(50);
    expect(() => parseAmazonLinkBatch(links.join("\n"))).toThrow("50");
  });
  it("deduplicates the same ASIN before any reads", () => {
    expect(parseAmazonLinkBatch("https://amazon.com.br/dp/B012345678?tag=a https://www.amazon.com.br/gp/product/B012345678?tag=b")).toHaveLength(1);
  });
  it("rejects disguised hosts and private targets", () => {
    for (const url of ["https://amazon.com.br.evil.test/dp/a", "https://evil.test/?amazon.com.br", "http://amazon.com.br/dp/a", "https://localhost/", "https://user@amazon.com.br/"]) {
      expect(() => validateAmazonProductUrl(url)).toThrow();
    }
  });
  it("stages each successful result serially without publishing", async () => {
    let active = 0;
    let maxActive = 0;
    const result = vi.fn();
    const wait = vi.fn(async () => {});
    await readAmazonLinkBatch({ urls: ["a", "b"], read: async (url) => {
      active++; maxActive = Math.max(active, maxActive); await Promise.resolve(); active--; return url;
    }, result, wait, cancelled: () => false });
    expect(result.mock.calls).toEqual([[0, "a", null], [1, "b", null]]);
    expect(maxActive).toBe(1);
    expect(wait).toHaveBeenCalledTimes(1);
  });
  it("stops on reader limits and preserves the remaining queue", async () => {
    const read = vi.fn(async () => { throw new Error("erro 429"); });
    const result = vi.fn();
    await readAmazonLinkBatch({ urls: ["a", "b"], read, result, wait: async () => {}, cancelled: () => false });
    expect(read).toHaveBeenCalledTimes(1);
    expect(result).toHaveBeenCalledTimes(1);
  });
  it("continues after an isolated invalid product and respects pause", async () => {
    const result = vi.fn();
    await readAmazonLinkBatch({ urls: ["a", "b"], read: async (url) => { if (url === "a") throw new Error("sem título"); return url; }, result, wait: async () => {}, cancelled: () => false });
    expect(result.mock.calls[1]).toEqual([1, "b", null]);
    const read = vi.fn();
    await readAmazonLinkBatch({ urls: ["a"], read, result, wait: async () => {}, cancelled: () => true });
    expect(read).not.toHaveBeenCalled();
  });
});