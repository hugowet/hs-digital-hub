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