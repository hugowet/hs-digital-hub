export function cjPlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function listText(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).join(", ");
    } catch {
      /* keep original text */
    }
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function mapCjDetails(product: Record<string, unknown>) {
  const description = cjPlainText(product.description ?? product.productDescription);
  const specifications: Record<string, string> = {};
  const fields: Record<string, string> = {
    productMaterial: "Material", productMaterialEn: "Material", materialNameEn: "Material",
    productWeight: "Peso informado pela CJ (g)", productUnit: "Unidade",
    packingWeight: "Peso com embalagem (g)",    productKeyEn: "Características", packingNameEn: "Embalagem",
    productLength: "Comprimento informado pela CJ", productWidth: "Largura informada pela CJ",
    productHeight: "Altura informada pela CJ",
  };
  for (const [field, label] of Object.entries(fields)) {
    const value = product[field];
    if (value !== null && value !== undefined && value !== "")
      specifications[label] = cjPlainText(listText(value));
  }
  // Official CJ descriptions usually list technical data as "Label: value" lines.
  for (const line of description.split("\n")) {
    const match = line.match(/^\s*([^:]{2,40}):\s*(.{1,200})$/);
    if (match?.[1] && match[2]?.trim()) specifications[match[1].trim()] = match[2].trim();
  }
  const extra = product.specifications ?? product.productSpecifications;
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== null && value !== undefined) specifications[cjPlainText(key)] = cjPlainText(String(value));
    }
  }
  return { description: description || null, description_long: description || null, specifications };
}

const technicalTerms: Record<string, string> = {
  "product information": "Informações do produto", "packing list": "Conteúdo da embalagem",
  "package contents": "Conteúdo da embalagem", "product image": "Imagem do produto",
  processor: "Processador", interface: "Interface", voltage: "Tensão", power: "Potência",
  material: "Material", color: "Cor", size: "Tamanho", weight: "Peso", battery: "Bateria",
  capacity: "Capacidade", dimensions: "Dimensões", length: "Comprimento", width: "Largura",
  height: "Altura", model: "Modelo", style: "Estilo", fabric: "Tecido", pattern: "Estampa",
  "plastic bags": "Sacos plásticos", plastic: "Plástico", cotton: "Algodão", leather: "Couro",
  polyester: "Poliéster", "stainless steel": "Aço inoxidável", silicone: "Silicone",
  black: "Preto", white: "Branco", pink: "Rosa", brown: "Marrom", red: "Vermelho",
  blue: "Azul", yellow: "Amarelo", green: "Verde", grey: "Cinza", gray: "Cinza",
};

/** Exact technical dictionary only: never pretend to translate arbitrary supplier prose. */
export function localizeCjTechnicalText(value: string) {
  let text = cjPlainText(value);
  for (const [source, target] of Object.entries(technicalTerms).sort((a, b) => b[0].length - a[0].length)) {
    text = text.replace(new RegExp(`\\b${source}\\b`, "gi"), target);
  }
  return text;
}

export function mapCjEconomicalDetails(product: Record<string, unknown>) {
  const original = mapCjDetails(product);
  const specifications = Object.fromEntries(Object.entries(original.specifications)
    .map(([label, value]) => [localizeCjTechnicalText(label), localizeCjTechnicalText(value)]));
  const description = original.description ? localizeCjTechnicalText(original.description) : null;
  return { description, description_long: description, specifications };
}