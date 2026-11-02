import { normalizeCatalogSearch } from "./catalog-search";

/** Category → popular search terms used by the trend tracker. */
const CATEGORIES: Record<string, string[]> = {
  moda: ["camiseta masculina", "vestido feminino", "calça jeans", "tênis masculino", "sandália feminina", "moletom"],
  roupa: ["camiseta masculina", "blusa feminina", "calça jeans", "bermuda masculina", "moletom", "vestido feminino"],
  calcado: ["tênis masculino", "tênis feminino", "sandália feminina", "chinelo", "bota", "sapatênis"],
  eletronico: ["fone de ouvido bluetooth", "caixa de som bluetooth", "smartwatch", "carregador celular", "power bank", "smart tv"],
  casa: ["jogo de panelas", "liquidificador", "air fryer", "sanduicheira", "micro-ondas", "panela de pressão elétrica"],
  cozinha: ["jogo de panelas", "frigideira antiaderente", "liquidificador", "multiprocessador", "sanduicheira", "air fryer"],
  ferramenta: ["furadeira", "parafusadeira", "roçadeira", "serra tico tico", "serra mármore", "jogo de chaves"],
  automotivo: ["acessórios para carro", "peças de moto", "carenagem moto", "capacete", "aspirador automotivo", "pneu moto"],
  esporte: ["bicicleta", "garrafa térmica", "halter", "tapete yoga", "caixa térmica", "bola de futebol"],
  beleza: ["perfume", "secador de cabelo", "prancha de cabelo", "kit maquiagem", "barbeador", "hidratante"],
  bolsa: ["mochila escolar", "bolsa feminina", "mochila notebook", "carteira masculina", "pochete", "mala de viagem"],
  informatica: ["notebook", "mouse sem fio", "teclado gamer", "monitor", "headset gamer", "ssd"],
  infantil: ["brinquedo educativo", "carrinho de controle remoto", "boneca", "lego", "mochila infantil", "jogo de tabuleiro"],
};
const ALIASES: Record<string, string> = {
  modas: "moda", roupas: "roupa", vestuario: "roupa", calcados: "calcado", sapato: "calcado", sapatos: "calcado", tenis: "calcado",
  eletronicos: "eletronico", celular: "eletronico", celulares: "eletronico", casas: "casa", eletrodomestico: "casa", eletrodomesticos: "casa",
  ferramentas: "ferramenta", carro: "automotivo", carros: "automotivo", moto: "automotivo", motos: "automotivo", esportes: "esporte",
  fitness: "esporte", bolsas: "bolsa", mochila: "bolsa", mochilas: "bolsa", computador: "informatica", computadores: "informatica",
  brinquedo: "infantil", brinquedos: "infantil", bebe: "infantil",
};

export const TREND_CATEGORY_LABELS = ["Moda", "Calçados", "Eletrônicos", "Casa", "Cozinha", "Ferramentas", "Automotivo", "Esporte", "Beleza", "Bolsas", "Informática", "Infantil"];

/** Returns search terms for a category; unknown text is used as-is. */
export function resolveTrendTerms(input: string): string[] {
  const key = normalizeCatalogSearch(input).trim();
  const cat = CATEGORIES[key] ? key : ALIASES[key];
  return cat ? CATEGORIES[cat] : [input.trim()];
}

/** Chaves de preço do rastreador: ATE60, ATE100, ATE150, ATE300, ATE350, ATE500. */
export const PRICE_TREND_KEYS = [60, 100, 150, 300, 350, 500] as const;
export const CHEAP_TREND_KEY = "ATE60";
export const CHEAP_TREND_MAX_PRICE = 60;
const CHEAP_TERMS = ["fone de ouvido", "carregador celular", "chaveiro", "lanterna led", "organizador", "capa celular", "utensílios cozinha", "acessórios carro"];

/** Chaves de peças: percorre um modelo por vez, todas as peças, depois pula para o próximo. */
export const MOTO_PARTS_KEY = "PECASMOTO";
export const CAR_PARTS_KEY = "PECASCARRO";
export const MOTO_MODELS = ["Biz", "CG 160", "CG 150 Titan", "Titan 160", "Fan 160", "Bros 160", "CB 300", "CB 500", "XRE 300", "Pop 110", "Factor 150", "Fazer 250", "Lander 250", "Crosser 150", "NMax", "PCX", "Twister 250", "XJ6", "MT-03", "Hornet"];
export const CAR_MODELS = ["Gol", "Palio", "Uno", "Celta", "Corsa", "Onix", "Prisma", "HB20", "Fiesta", "Ka", "Fox", "Polo", "Strada", "Saveiro", "Sandero", "Logan", "Civic", "Corolla", "Hilux", "S10"];
const MOTO_PARTS = ["carenagem", "pneu", "kit motor", "kit relação", "peças motor", "pastilha de freio", "farol", "retrovisor"];
const CAR_PARTS = ["peças motor", "pneu", "pastilha de freio", "amortecedor", "kit embreagem", "filtro de óleo", "farol", "parachoque"];

export type TrendQuery = { terms: string[]; maxPrice: number | null; vehicle?: string; nextCursor?: number; total?: number };

function vehicleTerms(models: string[], parts: string[], rest: string, cursor: number, pages: number): TrendQuery {
  const n = normalizeCatalogSearch(rest).trim();
  const picked = n ? models.filter((m) => normalizeCatalogSearch(m).includes(n)) : models;
  const list = (picked.length ? picked : [rest.trim()]).flatMap((m) => parts.map((p) => ({ m, t: `${p} ${m}` })));
  const start = ((cursor % list.length) + list.length) % list.length;
  const slice = Array.from({ length: Math.min(pages, list.length) }, (_, i) => list[(start + i) % list.length]);
  // Não mistura dois modelos na mesma rodada: termina as peças do atual antes de pular.
  const same = slice.filter((x) => x.m === slice[0].m);
  return { terms: same.map((x) => x.t), maxPrice: null, vehicle: same[0].m, nextCursor: (start + same.length) % list.length, total: list.length };
}

/** Lê chaves de preço (ATE60…ATE500) e de peças (PECASMOTO/PECASCARRO), sozinhas ou com termo. */
export function parseTrendQuery(input: string, cursor = 0, pages = 6): TrendQuery {
  let text = input;
  let maxPrice: number | null = null;
  const pm = text.match(/\bATE\s?(\d{2,3})\b/i);
  if (pm && (PRICE_TREND_KEYS as readonly number[]).includes(Number(pm[1]))) {
    maxPrice = Number(pm[1]);
    text = text.replace(pm[0], "").trim();
  }
  const vm = text.match(/\bPE[CÇ]AS\s?(MOTO|CARRO)\b/i);
  if (vm) {
    const isMoto = vm[1].toUpperCase() === "MOTO";
    const r = vehicleTerms(isMoto ? MOTO_MODELS : CAR_MODELS, isMoto ? MOTO_PARTS : CAR_PARTS, text.replace(vm[0], ""), cursor, pages);
    return { ...r, maxPrice };
  }
  if (maxPrice === null) return { terms: resolveTrendTerms(input), maxPrice: null };
  return { terms: text.length >= 2 ? resolveTrendTerms(text) : CHEAP_TERMS, maxPrice };
}
