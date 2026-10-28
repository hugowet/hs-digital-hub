import { parseHTML } from "linkedom";

export type AmazonAvailability = "available" | "unavailable" | "unknown";

/** Só marca indisponível se a página da Amazon indicar explicitamente falta de estoque */
export function extractAmazonAvailability(html: string): AmazonAvailability {
  if (!html) return "unknown";
  const { document } = parseHTML(html);
  
  // Se caiu em captcha, não altera nem marca como indisponível
  if (document.querySelector("#captchacharacters, form[action*='validateCaptcha']")) return "unknown";
  
  const text = Array.from(document.querySelectorAll("#availability, #outOfStock, #availabilityInsideBuyBox_feature_div"))
    .map((node) => node.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
  
  // Apenas se tiver mensagem explícita de esgotado na Amazon
  if (/indispon[ií]vel|sem estoque|esgotado|currently unavailable|out of stock|n[aã]o sabemos quando/i.test(text)) {
    return "unavailable";
  }
  
  if (/em estoque|in stock|dispon[ií]vel para compra|pronta entrega/i.test(text) && document.querySelector("#add-to-cart-button, #buy-now-button")) return "available";
  return "unknown";
}

export function confirmedAmazonStock(availability: AmazonAvailability, hasVariations = false): number {
  return availability === "available" && !hasVariations ? 1 : 0;
}
