import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuoteBatcher } from "./quote-batcher";

test("50 cards all settle in bounded batches without a 51st enqueue", async () => {
  const sizes: number[] = [];
  const enqueue = createQuoteBatcher(async (items: number[]) => { sizes.push(items.length); return items; }, 24, 0);
  const results = await Promise.all(Array.from({ length: 50 }, (_, i) => enqueue(i)));
  assert.deepEqual(sizes, [24, 24, 2]);
  assert.equal(results[49]?.includes(49), true);
});
test("failed batch does not strand later cards", async () => {
  const enqueue = createQuoteBatcher(async (items: number[]) => { if (items[0] === 0) throw new Error("offline"); return items; }, 1, 0);
  const results = await Promise.allSettled([enqueue(0), enqueue(1)]);
  assert.equal(results[0]?.status, "rejected");
  assert.equal(results[1]?.status, "fulfilled");
});