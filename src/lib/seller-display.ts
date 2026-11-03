/** The platform's dropshipping store is presented under themed HS Digital house brands per category. */
const PLATFORM_STORE = /jj\s*kuster/i;

const BRANDS: Record<string, string> = {
  "eletronicos-gadgets": "Tech & Gadgets Store",
  "celulares-tv": "Conecta Celulares Store",
  "perifericos-acessorios": "Acessórios Pro Importes",
  "casa-setup": "Casa & Estilo Store",
  moda: "Moda Express Store",
  beleza: "Beleza & Cuidado Store",
  esportes: "Esporte Ativo Store",
  infantil: "Kids Store",
  "autos-motos": "Auto Center Importes",
  ferramentas: "Ferramentas Importes",
  mercado: "Mercado & Utilidades Store",
};

export function sellerDisplayName(storeName: string | null | undefined, category?: string | null) {
  const name = storeName?.trim() || "HS Digital";
  if (!PLATFORM_STORE.test(name)) return name;
  return (category && BRANDS[category]) || "Variedades Importes";
}
