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
    packingWeight: "Peso com embalagem (g)", productType: "Tipo",
    productKeyEn: "Características", packingNameEn: "Embalagem",
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