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

/** Chave especial do rastreador: só produtos até R$ 60. */
export const CHEAP_TREND_KEY = "ATE60";
export const CHEAP_TREND_MAX_PRICE = 60;
const CHEAP_TERMS = ["fone de ouvido", "carregador celular", "chaveiro", "lanterna led", "organizador", "capa celular", "utensílios cozinha", "acessórios carro"];

/** Lê a chave ATE60 (sozinha ou com categoria/termo). */
export function parseTrendQuery(input: string): { terms: string[]; maxPrice: number | null } {
  const re = new RegExp(`\\b${CHEAP_TREND_KEY}\\b`, "i");
  if (!re.test(input)) return { terms: resolveTrendTerms(input), maxPrice: null };
  const rest = input.replace(re, "").trim();
  return { terms: rest.length >= 2 ? resolveTrendTerms(rest) : CHEAP_TERMS, maxPrice: CHEAP_TREND_MAX_PRICE };
}
