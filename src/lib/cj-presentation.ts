// Display-only formatting for CJ descriptions. Never invents content; only
// organizes the official supplier text into sections, lists and specs.

export type CjSection = { title: string; paragraphs: string[]; bullets: string[]; specs: [string, string][] };

const HEADINGS: Record<string, string> = {
  overview: "Visão geral", features: "Destaques", feature: "Destaques",
  description: "Descrição", "product description": "Descrição",
  specification: "Especificações", specifications: "Especificações",
  "product information": "Informações do produto", "informações do produto": "Informações do produto",
  "package content": "O que vem na embalagem", "package contents": "O que vem na embalagem",
  "package includes": "O que vem na embalagem", "packing list": "O que vem na embalagem",
  "conteúdo da embalagem": "O que vem na embalagem", note: "Observações", notes: "Observações",
  "product image": "", "imagem do produto": "",
};

// Supplier shipping notes (China Post, "warm tips") don't apply to HS checkout.
const NOISE = /(warm tips|china post|small packet|tracking information is not available|order amount is less|dear customer|please allow|manual measurement|due to the light|monitor|feedback|positive review)/i;

function headingOf(line: string): string | null {
  const key = line.replace(/[:：]\s*$/, "").trim().toLowerCase();
  if (!/[:：]\s*$/.test(line) && !(key in HEADINGS)) return null;
  if (key in HEADINGS) return HEADINGS[key];
  return key.length <= 30 && !/\d/.test(key) ? line.replace(/[:：]\s*$/, "").trim() : null;
}

export function formatCjDescription(text: string): CjSection[] {
  const sections: CjSection[] = [];
  let current: CjSection = { title: "", paragraphs: [], bullets: [], specs: [] };
  const push = () => {
    if (current.paragraphs.length || current.bullets.length || current.specs.length) sections.push(current);
  };
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line || NOISE.test(line)) continue;
    const heading = headingOf(line);
    if (heading !== null) {
      push();
      current = { title: heading, paragraphs: [], bullets: [], specs: [] };
      continue;
    }
    const bullet = line.match(/^(?:[-•*●▪]|\d{1,2}[.)])\s*(.+)$/);
    if (bullet) { current.bullets.push(bullet[1]); continue; }
    const spec = line.match(/^([^:：]{2,40})\s*[:：]\s*(.{1,200})$/);
    if (spec && spec[2].trim()) { current.specs.push([spec[1].trim(), spec[2].trim()]); continue; }
    if (line.length <= 90 && (current.title === "Destaques" || current.title === "O que vem na embalagem")) current.bullets.push(line);
    else current.paragraphs.push(line);
  }
  push();
  return sections;
}
