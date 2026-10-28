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
  
  return "available";
}

export function confirmedAmazonStock(availability: AmazonAvailability, _hasVariations?: boolean): number {
  // Só zera o estoque se a Amazon disser explicitamente que acabou
  if (availability === "unavailable") {
    return 0;
  }
  // Variações e checagens normais mantêm o produto ativo com estoque disponível
  return 999;
}
