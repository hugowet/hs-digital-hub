export const STORY_DURATION_MS = 24 * 60 * 60 * 1000;
export function normalizeSocialPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return null;
}
export function isActiveStory(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() > now;
}
export function isSocialOnline(lastSeenAt?: string | null, now = Date.now()): boolean {
  const seen = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
  return Number.isFinite(seen) && seen <= now && now - seen < 45000;
}
export function isSocialTyping(presence: { typing_conversation_id: string | null; typing_at: string | null; last_seen_at: string } | undefined, roomId: string, now = Date.now()): boolean {
  return Boolean(presence && isSocialOnline(presence.last_seen_at, now) && presence.typing_conversation_id === roomId && presence.typing_at && now - Date.parse(presence.typing_at) < 6000);
}