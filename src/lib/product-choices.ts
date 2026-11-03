export type ChoiceGroup = { name: string; options: string[]; selected?: string };

/** Groups the buyer must choose from (Cor, Tamanho...). Single-option groups need no choice. */
export function buyerChoiceGroups(variations: unknown): ChoiceGroup[] {
  if (!Array.isArray(variations)) return [];
  return variations
    .filter((g: any) => g && typeof g.name === "string" && Array.isArray(g.options))
    .map((g: any) => ({ name: String(g.name), options: g.options.map(String).filter(Boolean), selected: typeof g.selected === "string" ? g.selected : undefined }))
    .filter((g) => g.options.length > 0);
}

/** "Cor: Preto · Tamanho: 58" — only when every group has a valid choice. */
export function choiceLabel(groups: ChoiceGroup[], picked: Record<string, string>): string | null {
  const parts: string[] = [];
  for (const g of groups) {
    const value = g.options.length === 1 ? g.options[0] : picked[g.name];
    if (!value || !g.options.includes(value)) return null;
    parts.push(`${g.name}: ${value}`);
  }
  return parts.join(" · ");
}

/** Server-side check that a submitted label matches the product's real options exactly. */
export function isValidChoiceLabel(variations: unknown, label: string): boolean {
  const groups = buyerChoiceGroups(variations);
  if (!groups.length) return false;
  const picked: Record<string, string> = {};
  for (const part of label.split(" · ")) {
    const i = part.indexOf(": ");
    if (i < 0) return false;
    picked[part.slice(0, i)] = part.slice(i + 2);
  }
  return choiceLabel(groups, picked) === label;
}
