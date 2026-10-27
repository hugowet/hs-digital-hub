import { normalizeCatalogSearch } from "./catalog-search";

/** Templates are not supplier-confirmed variants or stock. */
export function amazonVariationTemplate(input: { title: string; description?: string; amazonCategory?: string }) {
  const text = normalizeCatalogSearch([input.title, input.description, input.amazonCategory].filter(Boolean).join(" "));
  if (/\b(tenis|calcado|calcados|sapato|sapatos|sandalia|sandalias|bota|botas|sneakers|shoes)\b/.test(text)) {
    return [{ name: "Numeração BR", options: Array.from({ length: 11 }, (_, i) => String(34 + i)), availability: "unconfirmed" as const }];
  }
  if (/\b(roupa|roupas|vestuario|camiseta|camisa|blusa|calca|bermuda|vestido|moletom|jaqueta|shirt|clothing)\b/.test(text)) {
    return [{ name: "Tamanho", options: ["P", "M", "G", "GG", "XG"], availability: "unconfirmed" as const }];
  }
  return [];
}