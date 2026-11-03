import { describe, expect, it } from "vitest";
import { countAudienceVisits } from "./audience-visit-counts";

const ownerId = "10ba6e31-4b9e-43e2-b063-18c43ac483c7";
const rows = [
  { user_id: ownerId, created_at: "2026-11-03T11:00:00Z" },
  { user_id: ownerId, created_at: "2026-11-01T11:00:00Z" },
  { user_id: "buyer", created_at: "2026-11-03T11:00:00Z" },
  { user_id: null, created_at: "2026-11-03T11:00:00Z" },
  { user_id: "buyer", created_at: "2026-10-29T11:00:00Z" },
  { user_id: "buyer", created_at: "2026-10-26T11:00:00Z" },
];

describe("audience owner exclusion", () => {
  it("excludes Hugo's logged-in visits today, retaining other accounts and anonymous visitors", () => {
    expect(countAudienceVisits(rows, "2026-11-03", "2026-10-28").viewsToday).toBe(2);
  });
  it("excludes Hugo's existing visits throughout the last seven days", () => {
    expect(countAudienceVisits(rows, "2026-11-03", "2026-10-28").views7d).toBe(3);
  });
});