import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allPublicProductIds } from "./sitemap-products";

describe("public sitemap pagination", () => {
  it("includes records beyond the first page", async () => {
    const calls: number[] = [];
    const ids = await allPublicProductIds(async (offset) => {
      calls.push(offset);
      return offset === 0 ? ["one", "two"] : offset === 2 ? ["three"] : [];
    }, 2);
    assert.deepEqual(ids, ["one", "two", "three"]);
    assert.deepEqual(calls, [0, 2, 3]);
  });
  it("rejects a later page failure rather than returning an incomplete sitemap", async () => {
    await assert.rejects(allPublicProductIds(async (offset) => {
      if (offset > 0) throw new Error("public query failed");
      return ["first"];
    }, 1), /public query failed/);
  });
});