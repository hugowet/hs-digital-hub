/**
 * Importação automática de tendências da Amazon (rodada agendada).
 *
 * Espelha a automação da CJ: uma rotina agendada varre categorias de produtos
 * nacionais, filtra somente ofertas de boa procedência (anti-golpe) e publica
 * em lote na vitrine, com margem dinâmica e categorização automática.
 *
 * Limites por execução: no máximo MAX_TOTAL_PER_RUN produtos publicados e
 * MAX_CATEGORIES_PER_RUN categorias varridas, para nunca estourar tempo/cota.
 */
import { parseHTML } from "linkedom";
import { extractDescription, extractSpecs } from "./amazon.functions";
import { amazonFullResImage, amazonHiResFromHtml } from "./amazon-image";
import { categorizeAmazonProduct } from "./amazon-category";
import { amazonVariationTemplate } from "./amazon-variations";
import { calculateFinalPrice } from "./pricing";
import { buildAmazonDescription, sanitizeAmazonSpecs, sanitizeAmazonText } from "./amazon-text";

const GATEWAY_V2 = "https://connector-gateway.lovable.dev/firecrawl/v2";
const AMAZON_AFFILIATE_TAG = "hsdigitalst0c-20";

/** Categorias varridas automaticamente (produtos nacionais vendidos na Amazon BR). */
export const AMAZON_AUTO_KEYWORDS: { keyword: string; hint: string }[] = [
  { keyword: "fone de ouvido bluetooth", hint: "eletronicos-gadgets" },
  { keyword: "caixa de som bluetooth", hint: "eletronicos-gadgets" },
  { keyword: "smartwatch", hint: "eletronicos-gadgets" },
  { keyword: "carregador turbo usb c", hint: "eletronicos-gadgets" },
  { keyword: "air fryer", hint: "casa-setup" },
  { keyword: "organizador cozinha", hint: "casa-setup" },
  { keyword: "luminária led", hint: "casa-setup" },
  { keyword: "mochila executiva", hint: "moda" },
  { keyword: "kit skincare", hint: "beleza" },
  { keyword: "suplemento whey", hint: "esporte" },
];

const MAX_CATEGORIES_PER_RUN = 3;
const MAX_TOTAL_PER_RUN = 50;
const PER_CATEGORY_TARGET = 17; // ~50 por rodada com 3 categorias

/** Piso de preço coerente: abaixo disso, sem oferta comprovada, é sinal de golpe. */
const MIN_TRUSTWORTHY_COST = 15;
const MAX_TRUSTWORTHY_COST = 5000;

interface TrendCandidate {
  url: string;
  title: string;
  rating: number;
  reviews: number;
  badge: string;
  fulfilledByAmazon: boolean;
}

/**
 * Filtro anti-golpe: só passa produto com reputação real e comprovável.
 * - Nota mínima 4.3 com volume mínimo de avaliações (loja golpista não sustenta
 *   centenas de avaliações positivas por muito tempo);
 * - Ou selo oficial ("Escolha da Amazon" / "Mais vendido") com avaliações;
 * - Ou envio pela Amazon (logística oficial, entrega garantida);
 * - Preço coerente é checado depois, com o custo real extraído da página.
 */
export function isTrustworthyTrend(p: TrendCandidate): boolean {
  if (!p.url || !p.title) return false;
  if (p.rating < 4.3) return false;
  if (p.reviews < 100) return false;
  const hasOfficialBadge = /escolha da amazon|mais vendido|best seller|best-seller/i.test(p.badge);
  if (p.rating >= 4.5 && p.reviews >= 500) return true;
  if (hasOfficialBadge && p.reviews >= 100) return true;
  if (p.fulfilledByAmazon && p.reviews >= 200) return true;
  return p.reviews >= 1000;
}

/** Coerência de preço: barato demais sem oferta comprovada = risco de golpe. */
export function isCoherentPrice(cost: number): boolean {
  return cost >= MIN_TRUSTWORTHY_COST && cost <= MAX_TRUSTWORTHY_COST;
}

const TREND_SCHEMA = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          rating: { type: "number" },
          reviews: { type: "number" },
          badge: { type: "string" },
          fulfilledByAmazon: { type: "boolean", description: "true se a página indica 'Enviado pela Amazon' ou 'Entregue pela Amazon'" },
        },
      },
    },
  },
};

function gatewayKeys() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIRECRAWL_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Serviço de leitura de páginas não configurado.");
  return { lovableKey, connectionKey };
}

async function scrapePage(url: string, formats: unknown[]) {
  const { lovableKey, connectionKey } = gatewayKeys();
  const res = await fetch(`${GATEWAY_V2}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
    body: JSON.stringify({
      url,
      formats,
      onlyMainContent: false,
      waitFor: 3000,
      location: { country: "BR", languages: ["pt-BR"] },
    }),
  });
  if (!res.ok) throw new Error(`scrape ${res.status}`);
  const json = await res.json();
  return json?.data && typeof json.data === "object" ? json.data : json;
}

async function searchCategoryWinners(keyword: string, target: number): Promise<TrendCandidate[]> {
  const pages = 3;
  const encoded = encodeURIComponent(keyword);
  const urls = Array.from({ length: pages }, (_, i) =>
    `https://www.amazon.com.br/s?k=${encoded}${i > 0 ? `&page=${i + 1}` : ""}`,
  );
  const responses = await Promise.allSettled(
    urls.map((url) =>
      scrapePage(url, [
        {
          type: "json",
          schema: TREND_SCHEMA,
          prompt:
            "Liste os produtos desta página de resultados da Amazon com url (link do produto), título, nota em estrelas (rating), número de avaliações (reviews), selo (badge) como 'Escolha da Amazon' ou 'Mais vendido', e fulfilledByAmazon (true se indicar 'Enviado pela Amazon' ou 'Entregue pela Amazon'). Use somente o que estiver visível na página.",
        },
      ]),
    ),
  );

  const seen = new Set<string>();
  const winners: TrendCandidate[] = [];
  for (const res of responses) {
    if (res.status !== "fulfilled") continue;
    const list = res.value?.json?.products;
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const p = raw as Record<string, unknown>;
      const dpMatch = String(p?.url ?? "").match(/\/dp\/([A-Z0-9]{10})/i) ?? String(p?.url ?? "").match(/\/gp\/product\/([A-Z0-9]{10})/i);
      if (!dpMatch) continue;
      const url = `https://www.amazon.com.br/dp/${dpMatch[1]}`;
      if (seen.has(url)) continue;
      const candidate: TrendCandidate = {
        url,
        title: String(p?.title ?? ""),
        rating: Number(p?.rating) || 0,
        reviews: Number(p?.reviews) || 0,
        badge: String(p?.badge ?? ""),
        fulfilledByAmazon: Boolean(p?.fulfilledByAmazon),
      };
      if (!isTrustworthyTrend(candidate)) continue;
      seen.add(url);
      winners.push(candidate);
    }
  }
  winners.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  return winners.slice(0, target);
}

const PRODUCT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    price: { type: "number" },
    images: { type: "array", items: { type: "string" } },
    specs: { type: "object" },
  },
};

async function fetchProductData(url: string) {
  const payload = await scrapePage(url, [
    "rawHtml",
    { type: "json", schema: PRODUCT_SCHEMA, prompt: "Extraia título, preço atual em reais e todas as URLs de fotos do produto desta página da Amazon." },
  ]);
  const json = payload?.json ?? null;
  const rawHtml: string = typeof payload?.rawHtml === "string" ? payload.rawHtml : "";
  if (!json?.title && !rawHtml) return null;

  let description = "";
  let specs: Record<string, string> = {};
  let htmlTitle = "";
  let amazonCategory = "";
  if (rawHtml) {
    const { document } = parseHTML(rawHtml);
    description = extractDescription(document);
    specs = extractSpecs(document);
    htmlTitle = (document.querySelector("#productTitle")?.textContent ?? "").replace(/\s+/g, " ").trim();
    amazonCategory = (document.querySelector("#wayfinding-breadcrumbs_feature_div")?.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  const extracted: string[] = Array.isArray(json?.images)
    ? json.images.filter((u: unknown) => typeof u === "string" && u.startsWith("http")).map(amazonFullResImage)
    : [];
  const hiRes = amazonHiResFromHtml(rawHtml);
  const images: string[] = Array.from(new Set<string>(hiRes.length ? hiRes : extracted)).slice(0, 10);
  return {
    title: String(json?.title ?? htmlTitle ?? ""),
    costPrice: Number(json?.price) || 0,
    description,
    mainImage: images[0] ?? "",
    gallery: images.slice(1),
    specs,
    amazonCategory,
  };
}

function asinFromUrl(url: string): string | null {
  const m = url.match(/\/dp\/([A-Z0-9]{10})/i) ?? url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
}

export interface AmazonAutoImportResult {
  scanned: number;
  candidates: number;
  published: number;
  skippedExisting: number;
  rejectedPrice: number;
  failed: number;
  categories: string[];
}

/**
 * Rodada automática: varre até MAX_CATEGORIES_PER_RUN categorias (rotacionando a
 * partir do cursor salvo), filtra ofertas confiáveis, pula produtos já
 * importados (dedupe por ASIN) e publica em lote com margem dinâmica.
 */
export async function runAmazonAutoImport(
  supabaseAdmin: any,
  storeId: string,
  cursor = 0,
): Promise<AmazonAutoImportResult> {
  const result: AmazonAutoImportResult = {
    scanned: 0, candidates: 0, published: 0, skippedExisting: 0, rejectedPrice: 0, failed: 0, categories: [],
  };

  // ASINs já importados (dedupe idempotente)
  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("specifications")
    .eq("supplier", "amazon")
    .limit(5000);
  const knownAsins = new Set<string>();
  for (const row of existing ?? []) {
    const url = String((row.specifications as Record<string, unknown> | null)?.affiliate_url ?? "");
    const asin = asinFromUrl(url);
    if (asin) knownAsins.add(asin);
  }

  const keywords = AMAZON_AUTO_KEYWORDS;
  const batch = Array.from({ length: Math.min(MAX_CATEGORIES_PER_RUN, keywords.length) }, (_, i) =>
    keywords[(cursor + i) % keywords.length],
  );

  // 1) Busca vencedores por categoria (em paralelo entre categorias)
  const perCategory = await Promise.allSettled(batch.map((b) => searchCategoryWinners(b.keyword, PER_CATEGORY_TARGET)));
  const candidates: TrendCandidate[] = [];
  perCategory.forEach((res, i) => {
    result.scanned++;
    if (res.status === "fulfilled") {
      result.categories.push(batch[i].hint);
      candidates.push(...res.value);
    }
  });
  result.candidates = candidates.length;

  // 2) Remove já importados
  const fresh = candidates.filter((c) => {
    const asin = asinFromUrl(c.url);
    if (asin && knownAsins.has(asin)) {
      result.skippedExisting++;
      return false;
    }
    return true;
  }).slice(0, MAX_TOTAL_PER_RUN);

  // 3) Puxa dados completos em paralelo (lotes de 8 para não sufocar o serviço)
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < fresh.length; i += 8) {
    const chunk = fresh.slice(i, i + 8);
    const details = await Promise.allSettled(chunk.map((c) => fetchProductData(c.url)));
    details.forEach((res, j) => {
      const candidate = chunk[j];
      if (res.status !== "fulfilled" || !res.value?.title) {
        result.failed++;
        return;
      }
      const data = res.value;
      // Coerência de preço: custo absurdo (barato demais ou fora da faixa) é rejeitado.
      if (!isCoherentPrice(data.costPrice)) {
        result.rejectedPrice++;
        return;
      }
      const cost = data.costPrice;
      const salePrice = calculateFinalPrice(cost);
      const title = sanitizeAmazonText(data.title);
      const description = buildAmazonDescription(data.description);
      const gallery = Array.from(new Set([data.mainImage, ...data.gallery].filter((u) => u.startsWith("http"))));
      const category = categorizeAmazonProduct({ title, description, amazonCategory: data.amazonCategory || candidate.title });
      const variations = amazonVariationTemplate({ title, description, amazonCategory: data.amazonCategory });
      const affiliateUrl = new URL(candidate.url);
      affiliateUrl.searchParams.set("tag", AMAZON_AFFILIATE_TAG);
      rows.push({
        store_id: storeId,
        title,
        description,
        description_long: description,
        price: salePrice,
        compare_at_price: Number((salePrice * 1.25).toFixed(2)),
        supplier_cost: cost,
        image_url: data.mainImage || null,
        gallery_urls: gallery,
        free_shipping: true,
        is_active: true,
        category,
        variations,
        stock: variations.length ? 0 : 999,
        supplier: "amazon",
        product_type: "physical",
        specifications: {
          ...sanitizeAmazonSpecs(data.specs),
          affiliate_url: affiliateUrl.toString(),
          partner: "amazon",
          affiliate_id: AMAZON_AFFILIATE_TAG,
          auto_imported: true,
          trust: { rating: candidate.rating, reviews: candidate.reviews, badge: candidate.badge, fulfilled_by_amazon: candidate.fulfilledByAmazon },
        },
      });
    });
  }

  // 4) Publicação em lote única
  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from("products").insert(rows);
    if (error) throw error;
    result.published = rows.length;
  }
  return result;
}
