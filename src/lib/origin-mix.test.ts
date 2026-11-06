import { describe, expect, it } from "vitest";
import { mixByOrigin } from "./origin-mix";

describe("mixByOrigin", () => {
  it("shows 4 Amazon then 1 CJ", () => {
    const items = [
      ...Array.from({ length: 3 }, (_, i) => ({ id: `c${i}`, supplier: "cj" })),
      ...Array.from({ length: 8 }, (_, i) => ({ id: `a${i}`, supplier: "amazon" })),
    ];
    expect(mixByOrigin(items).map((p) => p.supplier).slice(0, 10)).toEqual([
      "amazon", "amazon", "amazon", "amazon", "cj",
      "amazon", "amazon", "amazon", "amazon", "cj",
    ]);
  });
});
