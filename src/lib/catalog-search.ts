export function normalizeCatalogSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").trim();
}

export function catalogSearchGroups(value: string) {
  const stop = new Set(["de", "do", "da", "dos", "das", "em", "no", "na", "para", "pra", "com", "sem", "e", "ou", "o", "a", "os", "as", "um", "uma"]);
  const synonyms: Record<string, string[]> = {
    fone: ["fone", "fones", "headphone", "earphone", "earbuds", "headset"],
    fones: ["fone", "headphone", "earphone", "earbuds", "headset"],
    relogio: ["relogio", "watch", "smartwatch"], relogios: ["relogio", "watch", "smartwatch"],
    celular: ["celular", "smartphone", "phone"], carregador: ["carregador", "charger"],
    furadeira: ["furadeira", "drill"], martelete: ["martelete", "rotary hammer", "hammer drill"],
    som: ["som", "speaker", "sound"], ouvido: ["ouvido", "earphone", "earbuds", "headphone", "headset"],
    bluetooth: ["bluetooth", "bt"], oculos: ["oculos", "glasses", "sunglasses"],
    tenis: ["tenis", "sneakers", "shoes"], camiseta: ["camiseta", "shirt"],
  };
  return [...new Set(normalizeCatalogSearch(value).split(/\s+/).filter((word) => word.length >= 2 && !stop.has(word)))].slice(0, 8)
    .map((word) => synonyms[word] ?? [word]);
}