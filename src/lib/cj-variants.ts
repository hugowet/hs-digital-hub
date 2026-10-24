export type CjVariantOption = {
  id: string;
  label: string;
  sku: string | null;
  costUsd: number;
  image: string | null;
};

const colors: Record<string, string> = {
  black: "Preto", white: "Branco", brown: "Marrom", pink: "Rosa", yellow: "Amarelo",
  blue: "Azul", green: "Verde", red: "Vermelho", gray: "Cinza", grey: "Cinza",
  purple: "Roxo", orange: "Laranja", silver: "Prata", gold: "Dourado",
};

export function cjVariantOptions(details: Record<string, unknown> | null | undefined): CjVariantOption[] {
  const rows = details?.variants;
  if (!Array.isArray(rows)) return [];
  const options = new Map<string, CjVariantOption>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const id = typeof row.vid === "string" ? row.vid.trim() : "";
    const costUsd = Number(row.variantSellPrice);
    // Never derive a supplier variant identifier from a size label.
    if (!id || !Number.isFinite(costUsd) || costUsd <= 0) continue;
    const original = String(row.variantKey || row.variantSku || id);
    const label = original.split("-").map((part) => colors[part.toLowerCase()] ?? part).join(" · ");
    options.set(id, { id, label, costUsd, sku: row.variantSku || null,
      image: typeof row.variantImage === "string" && row.variantImage.startsWith("https://") ? row.variantImage : null });
  }
  return [...options.values()];
}

export function cjVariantStock(payload: unknown) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const nested = (payload as Record<string, unknown>).data;
    if (nested && typeof nested === "object") return cjVariantStock(nested);
  }
  const rows = Array.isArray(payload) ? payload : [payload];
  const total = rows.reduce((sum, row) => {
    if (!row || typeof row !== "object") return sum;
    const value = Number(row.storageNum ?? row.totalInventory ?? row.totalStock ?? 0);
    return sum + (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
  }, 0);
  return total;
}

export function cjSellableStock(stock: number) { return Number.isFinite(stock) && stock > 0; }