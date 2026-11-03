/**
 * Extrai a lista "o que vem no produto" da descrição (ex.: "Package Included:",
 * "Conteúdo da embalagem:", "Itens inclusos:", "Contém:") para exibir em destaque.
 * Só usa o que está escrito na descrição; nunca inventa itens.
 */
const HEADER =
  /^\s*[-•*]?\s*(package\s+includes?|package\s+included|package\s+contents?|in\s+the\s+box|what'?s\s+in\s+the\s+box|conte[úu]do\s+da\s+(embalagem|caixa)|itens?\s+inclu[íi]dos?|itens?\s+inclusos?|inclui|acompanha|cont[ée]m|o\s+que\s+vem\s+na\s+caixa|a\s+embalagem\s+cont[ée]m|kit\s+cont[ée]m)\s*[:：]\s*(.*)$/i;

const STOP = /^\s*(m[ée]todo de entrega|specifications?|especifica[çc][õo]es|features?|caracter[íi]sticas|notes?|observa[çc][ãa]o|garantia)\b/i;

export function extractProductContents(description: string): { contents: string[]; rest: string } {
  if (!description) return { contents: [], rest: "" };
  const lines = description.split(/\r?\n/);
  const idx = lines.findIndex((l) => HEADER.test(l));
  if (idx < 0) return { contents: [], rest: description };

  const items: string[] = [];
  const inline = lines[idx].match(HEADER)?.[3]?.trim() ?? "";
  if (inline) items.push(...inline.split(/[;,]|\s\+\s/));
  let end = idx + 1;
  for (; end < lines.length && !inline; end++) {
    const l = lines[end].trim();
    if (!l) {
      if (items.length) break;
      continue;
    }
    if (STOP.test(l) || HEADER.test(l) || l.length > 120 || /[:：]/.test(l)) break;
    items.push(l);
  }
  const contents = items
    .map((s) => s.replace(/^(?:[-•*]\s*|\d+[.)]\s+)/, "").trim())
    .filter((s) => s.length > 1 && s.length <= 120)
    .slice(0, 25);
  if (!contents.length) return { contents: [], rest: description };
  // A lista é um destaque adicional: nunca recorta a descrição original.
  return { contents, rest: description };
}
