export function cjPlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function mapCjDetails(product: Record<string, unknown>) {
  const description = cjPlainText(product.description ?? product.productDescription);
  const specifications: Record<string, string> = {};
  const fields: Record<string, string> = {
    productMaterial: "Material", productMaterialEn: "Material",
    productWeight: "Peso informado pela CJ (g)", productUnit: "Unidade",
    packingWeight: "Peso com embalagem (g)", productType: "Tipo",
    productKeyEn: "Características", packingNameEn: "Embalagem",
    productLength: "Comprimento informado pela CJ", productWidth: "Largura informada pela CJ",
    productHeight: "Altura informada pela CJ",
  };
  for (const [field, label] of Object.entries(fields)) {
    const value = product[field];
    if (value !== null && value !== undefined && value !== "")
      specifications[label] = cjPlainText(typeof value === "string" ? value : JSON.stringify(value));
  }
  const extra = product.specifications ?? product.productSpecifications;
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== null && value !== undefined) specifications[cjPlainText(key)] = cjPlainText(String(value));
    }
  }
  return { description: description || null, description_long: description || null, specifications };
}