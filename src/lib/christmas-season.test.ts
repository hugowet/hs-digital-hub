import { describe, expect, it } from "vitest";
import { isChristmasSeason } from "./christmas-season";

describe("one-off Christmas decoration in Boa Vista", () => {
  it("is visible during the requested November/December season", () => {
    expect(isChristmasSeason(Date.parse("2026-11-16T08:25:00-04:00"))).toBe(true);
    expect(isChristmasSeason(Date.parse("2026-12-25T12:00:00-04:00"))).toBe(true);
  });
  it("disappears at the start of January 5, not January 6", () => {
    expect(isChristmasSeason(Date.parse("2027-01-04T23:59:59.999-04:00"))).toBe(true);
    expect(isChristmasSeason(Date.parse("2027-01-05T00:00:00-04:00"))).toBe(false);
  });
  it("does not reappear in later years or before the season", () => {
    expect(isChristmasSeason(Date.parse("2026-11-15T23:59:59-04:00"))).toBe(false);
    expect(isChristmasSeason(Date.parse("2027-12-25T12:00:00-04:00"))).toBe(false);
  });
});