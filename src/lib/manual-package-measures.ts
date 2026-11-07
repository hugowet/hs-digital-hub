/** Read only explicitly labelled package measurements, never estimate from product type. */
export function packageMeasures(text: string) {
  const number = "([0-9]+(?:[.,][0-9]+)?)";
  const read = (label: string, unit: string) => {
    const match = text.match(new RegExp(`${label}\\s*(?:da embalagem)?\\s*[:=]\\s*${number}\\s*(${unit})\\b`, "i"));
    if (!match) return undefined;
    const amount = Number(match[1].replace(",", "."));
    return amount > 0 ? String(match[2].toLowerCase() === "g" ? amount / 1000 : amount) : undefined;
  };
  return { weightKg: read("peso", "kg|g"), heightCm: read("altura", "cm"), widthCm: read("largura", "cm"), lengthCm: read("comprimento", "cm") };
}