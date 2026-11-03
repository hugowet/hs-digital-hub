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
export const CAR_MODELS = ["Ranger", "Amarok", "Frontier", "L200", "Toro", "Montana", "Gol", "Palio", "Uno", "Celta", "Corsa", "Onix", "Prisma", "HB20", "Fiesta", "Ka", "Fox", "Polo", "Strada", "Saveiro", "Sandero", "Logan", "Civic", "Corolla", "Hilux", "S10"];
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
  const fam = familyQuery(text, cursor, pages);
  if (fam) return { ...fam, maxPrice };
  const direct = directVehicleQuery(text, cursor, pages);
  if (direct) return { ...direct, maxPrice };
  if (maxPrice === null) return { terms: resolveTrendTerms(input), maxPrice: null };
  return { terms: text.length >= 2 ? resolveTrendTerms(text) : CHEAP_TERMS, maxPrice };
}

/** Peças completas para busca direta pelo nome do veículo (ex.: "Biz", "CB 300 2008/2009"). */
const MOTO_FULL_PARTS = [...MOTO_PARTS, "kit cilindro", "kit embreagem", "escapamento", "banco", "bateria", "corrente", "manete", "pedaleira", "guidão", "lanterna traseira", "pisca", "bobina", "vela", "filtro de ar", "cabo de embreagem", "disco de freio", "amortecedor", "tanque"];
const CAR_FULL_PARTS = [...CAR_PARTS, "kit correia dentada", "bomba de água", "radiador", "vela de ignição", "bobina de ignição", "sensor", "bateria", "retrovisor", "lanterna traseira", "pastilha e disco de freio", "bandeja suspensão", "pivô", "terminal de direção", "filtro de ar", "junta cabeçote", "tapete", "capa de banco"];
const YEAR_RE = /\b((?:19|20)\d{2})(?:\s*[\/-]\s*((?:19|20)?\d{2}))?\b/;

function matchModel(models: string[], n: string): string | undefined {
  return [...models].sort((a, b) => b.length - a.length).find((m) => {
    const k = normalizeCatalogSearch(m);
    return n === k || n.startsWith(k + " ");
  });
}

/** Nome do veículo (com ano opcional) vira busca de todas as peças daquele veículo. */
export function directVehicleQuery(text: string, cursor = 0, pages = 6): TrendQuery | null {
  const ym = text.match(YEAR_RE);
  const year = ym ? ym[0].replace(/\s+/g, "") : "";
  const base = (ym ? text.replace(ym[0], " ") : text).replace(/\s+/g, " ").trim();
  const n = normalizeCatalogSearch(base).trim();
  if (!n) return null;
  const moto = matchModel(MOTO_MODELS, n);
  const car = moto ? undefined : matchModel(CAR_MODELS, n);
  if (!moto && !car && !year) return null;
  const parts = car ? CAR_FULL_PARTS : MOTO_FULL_PARTS.concat(moto ? [] : CAR_FULL_PARTS.filter((p) => !MOTO_FULL_PARTS.includes(p)));
  const vehicle = [base, year].filter(Boolean).join(" ");
  const list = parts.map((p) => `${p} ${vehicle}`);
  const start = ((cursor % list.length) + list.length) % list.length;
  const terms = Array.from({ length: Math.min(pages, list.length) }, (_, i) => list[(start + i) % list.length]);
  return { terms, maxPrice: null, vehicle, nextCursor: (start + terms.length) % list.length, total: list.length };
}

const TRUCK_PARTS = ["peças caminhão", "pneu caminhão", "lona de freio caminhão", "filtro de óleo caminhão", "farol caminhão", "lanterna caminhão", "retrovisor caminhão", "amortecedor cabine caminhão", "kit embreagem caminhão", "bateria caminhão", "parachoque caminhão", "acessórios cabine caminhão"];
const BIKE_PARTS = ["peças bicicleta", "pneu bicicleta", "câmara de ar bicicleta", "corrente bicicleta", "freio bicicleta", "selim bicicleta", "pedal bicicleta", "guidão bicicleta", "câmbio bicicleta", "farol bicicleta", "capacete ciclismo", "bomba de ar bicicleta"];
const PHONE_ITEMS = ["", "capinha", "película", "carregador", "cabo usb", "fone de ouvido", "tela display", "bateria", "suporte veicular", "power bank"];
const PHONE_WORDS = /^(celular|celulares|smartphone|iphone|galaxy|samsung|motorola|moto g|moto e|xiaomi|redmi|poco|realme|lg)\b/;

function rotate(list: string[], label: string, cursor: number, pages: number): TrendQuery {
  const start = ((cursor % list.length) + list.length) % list.length;
  const terms = Array.from({ length: Math.min(pages, list.length) }, (_, i) => list[(start + i) % list.length]);
  return { terms, maxPrice: null, vehicle: label, nextCursor: (start + terms.length) % list.length, total: list.length };
}

/** Caminhão, bicicleta e celular: puxam o item e tudo ligado a ele (peças/acessórios). */
export function familyQuery(text: string, cursor = 0, pages = 6): TrendQuery | null {
  const raw = text.replace(/\s+/g, " ").trim();
  const n = normalizeCatalogSearch(raw).trim();
  if (/^caminh(ao|oes)\b/.test(n)) {
    const rest = raw.split(" ").slice(1).join(" ");
    return rotate(TRUCK_PARTS.map((p) => (rest ? `${p} ${rest}` : p)), raw, cursor, pages);
  }
  if (/^(bicicleta|bicicletas|bike|bikes)\b/.test(n)) {
    const rest = raw.split(" ").slice(1).join(" ");
    return rotate(BIKE_PARTS.map((p) => (rest ? `${p} ${rest}` : p)), raw, cursor, pages);
  }
  if (PHONE_WORDS.test(n)) {
    const model = /^(celular|celulares|smartphone)$/.test(n) ? "celular" : raw.replace(/^(celulares?|smartphone)\s+/i, "");
    const list = PHONE_ITEMS.map((i) => (i ? `${i} ${model}` : model === "celular" ? "smartphone" : model));
    return rotate(list, model, cursor, pages);
  }
  return null;
}
