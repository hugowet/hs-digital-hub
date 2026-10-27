/**
 * Limpeza de textos de produtos importados da Amazon.
 * Remove menções à marca Amazon de títulos, descrições e especificações para
 * o cliente não achar que foi "passado para trás" ao receber embalagem da Amazon,
 * e padroniza o texto de método de entrega como parceria logística.
 */

export const AMAZON_DELIVERY_METHOD_TEXT =
  "Método de entrega: parceria com a logística Amazon para entrega rápida, rastreada e segura em todo o Brasil.";

/** Remove/substitui menções à Amazon em qualquer texto visível ao cliente. */
export function sanitizeAmazonText(text: string): string {
  if (!text) return "";
  return text
    .replace(/escolha da amazon/gi, "Escolha dos Clientes")
    .replace(/enviado pela amazon|entregue pela amazon|envio pela amazon/gi, "enviado pela logística parceira")
    .replace(/amazon\s*basics/gi, "Linha Essencial")
    .replace(/amazon\s*prime/gi, "entrega prioritária")
    .replace(/amazon\.com(\.br)?|amzn\.[a-z.]+/gi, "nossa loja")
    .replace(/\bamazon\b/gi, "logística parceira")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Descrição final do produto: limpa de menções à Amazon + método de entrega padronizado. */
export function buildAmazonDescription(rawDescription: string): string {
  const clean = sanitizeAmazonText(rawDescription);
  const base = clean || "Produto oficial com garantia e entrega rápida.";
  if (base.includes("Método de entrega:")) return base;
  return `${base}\n\n${AMAZON_DELIVERY_METHOD_TEXT}`;
}

/** Especificações limpas: chaves e valores sem menções à Amazon. */
export function sanitizeAmazonSpecs(specs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(specs)) {
    const k = sanitizeAmazonText(key);
    const v = sanitizeAmazonText(value);
    if (k && v) out[k] = v;
  }
  return out;
}
