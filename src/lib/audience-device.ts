export type AudienceDevice = "mobile" | "desktop" | "tablet" | "unknown";

/** Classifies a browser user agent without storing the raw value. */
export function classifyAudienceDevice(userAgent: string | null | undefined): AudienceDevice {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "unknown";
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/.test(ua)) return "mobile";
  return "desktop";
}

export function cleanAudiencePlace(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, 120);
  return text || null;
}

export function audienceLocation(cf: Record<string, unknown>) {
  const raw = cleanAudiencePlace(cf["country"]);
  return {
    country: raw && /^[A-Z]{2}$/.test(raw) && raw !== "XX" ? raw : null,
    city: cleanAudiencePlace(cf["city"]),
    region: cleanAudiencePlace(cf["region"]),
  };
}
