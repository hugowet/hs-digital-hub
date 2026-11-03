// Stable account identity verified server-side; never accept this from the browser.
const OWNER_ACCOUNT_ID = "10ba6e31-4b9e-43e2-b063-18c43ac483c7";

export function countAudienceVisits(
  rows: Array<{ user_id: string | null; created_at: string }>,
  todayKey: string,
  weekKey: string,
) {
  let viewsToday = 0;
  let views7d = 0;
  for (const row of rows) {
    if (row.user_id === OWNER_ACCOUNT_ID) continue;
    const key = row.created_at.slice(0, 10);
    if (key === todayKey) viewsToday += 1;
    if (key >= weekKey) views7d += 1;
  }
  return { viewsToday, views7d };
}