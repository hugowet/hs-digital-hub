/** The platform's dropshipping store is presented under themed HS Digital house brands per category. */
const PLATFORM_STORE = /jj\s*kuster/i;

const BRANDS: Record<string, string> = {
  "eletronicos-gadgets": "HS Tech & Gadgets",
  "celulares-tv": "HS Conecta Celulares",
  "perifericos-acessorios": "HS Acessórios Pro",
  "casa-setup": "HS Casa & Estilo",
  moda: "HS Moda Express",
  beleza: "HS Beleza & Cuidado",
  esportes: "HS Esporte Ativo",
  infantil: "HS Kids Store",
  "autos-motos": "HS Auto Center",
  ferramentas: "HS Ferramentas",
  mercado: "HS Mercado & Utilidades",
};

export function sellerDisplayName(storeName: string | null | undefined, category?: string | null) {
  const name = storeName?.trim() || "HS Digital";
  if (!PLATFORM_STORE.test(name)) return name;
  return (category && BRANDS[category]) || "HS Variedades";
}
