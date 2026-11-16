// One-off decoration; Boa Vista remains UTC−4 throughout this season.
export const CHRISTMAS_START = Date.parse("2026-11-16T00:00:00-04:00");
export const CHRISTMAS_END = Date.parse("2027-01-05T00:00:00-04:00");

export function isChristmasSeason(now: number = Date.now()): boolean {
  return now >= CHRISTMAS_START && now < CHRISTMAS_END;
}