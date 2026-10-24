import { describe, expect, it } from "vitest";
import { allPublicProductIds } from "./sitemap-products";

describe("public sitemap pagination", () => {
  it("includes records beyond the first page", async () => {
    const calls: number[] = [];
    const ids = await allPublicProductIds(async (offset) => {
      calls.push(offset);
      return offset === 0 ? ["one", "two"] : offset === 2 ? ["three"] : [];
    }, 2);
    expect(ids).toEqual(["one", "two", "three"]);
    expect(calls).toEqual([0, 2, 3]);
  });
  it("rejects a later page failure rather than returning an incomplete sitemap", async () => {
    await expect(allPublicProductIds(async (offset) => {
      if (offset > 0) throw new Error("public query failed");
      return ["first"];
    }, 1)).rejects.toThrow("public query failed");
  });
});