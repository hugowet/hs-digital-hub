import { parseHTML } from "linkedom";

export type AmazonAvailability = "available" | "unavailable" | "unknown";

/** Only the main buy box confirms this ASIN; recommendations never count. */
export function extractAmazonAvailability(html: string): AmazonAvailability {
  if (!html) return "unknown";
  const { document } = parseHTML(html);
  if (document.querySelector("#captchacharacters, form[action*='validateCaptcha']")) return "unknown";
  const text = Array.from(document.querySelectorAll("#availability, #outOfStock, #availabilityInsideBuyBox_feature_div"))
    .map((node) => node.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
  if (/indispon[ií]vel|sem estoque|esgotado|currently unavailable|out of stock|n[aã]o sabemos quando/i.test(text)) return "unavailable";
  if (!document.querySelector("#productTitle")) return "unknown";
  const buy = document.querySelector("#add-to-cart-button, #buy-now-button");
  if (!buy || buy.hasAttribute("disabled") || buy.getAttribute("aria-disabled") === "true") return "unknown";
  return /em estoque|in stock|restam apenas|dispon[ií]vel para envio/i.test(text) ? "available" : "unknown";
}

export function confirmedAmazonStock(availability: AmazonAvailability, hasVariations: boolean): number {
  // A buy box confirms one unit, not the supplier's complete inventory.
  return availability === "available" && !hasVariations ? 1 : 0;
}