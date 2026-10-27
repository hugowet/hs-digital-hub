import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseHTML } from "linkedom";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_EMAILS = ["hugoet373@gmail.com", "hugohug12ou@gmail.com"];
const GATEWAY_V2 = "https://connector-gateway.lovable.dev/firecrawl/v2";

const PRODUCT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título completo do produto" },
    price: { type: "number", description: "Preço atual de venda em reais (apenas o número, sem símbolo)" },
    images: { type: "array", items: { type: "string" }, description: "URLs das fotos do produto (m.media-amazon.com)" },
    specs: { type: "object", description: "Especificações técnicas mencionadas na página (marca, cor, conectividade, voltagem, dimensões etc.). Use SOMENTE fatos presentes na página; nunca invente." },
  },
};

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** "Sobre este item": bullets de #feature-bullets / .a-unordered-list.a-vertical.a-spacing-mini → markdown. */
export function extractDescription(doc: Document): string {
  const container =
    doc.querySelector("#feature-bullets") ??
    doc.querySelector(".a-unordered-list.a-vertical.a-spacing-mini") ??
    doc.querySelector("#feature-bullets_feature_div");
  if (!container) return "";
  const bullets = Array.from(container.querySelectorAll("li .a-list-item, li"))
    .map((li) => cleanText(li.textContent))
    .filter((t) => t.length > 2 && !/certifique-se|verifique se/i.test(t));
  const unique = [...new Set(bullets)];
  if (!unique.length) return "";
  return unique.map((t) => `• ${t}`).join("\n");
}

function addSpec(specs: Record<string, string>, key: string, value: string) {
  const k = cleanText(key).replace(/[:\u200e\u200f]+$/g, "");
  const v = cleanText(value);
  if (k && v && k.length < 80 && v.length < 500 && !specs[k]) specs[k] = v;
}

/** Tabelas de especificações: #productDetails_techSpec_section_1, .prodDetTable, #detailBullets_feature_div. */
export function extractSpecs(doc: Document): Record<string, string> {
  const specs: Record<string, string> = {};

  // 1) Tabelas de informações técnicas (th/td)
  const tables = [
    ...Array.from(doc.querySelectorAll("#productDetails_techSpec_section_1 tr")),
    ...Array.from(doc.querySelectorAll("#productDetails_detailBullets_sections1 tr")),
    ...Array.from(doc.querySelectorAll(".prodDetTable tr")),
  ];
  for (const row of tables) {
    const th = row.querySelector("th");
    const td = row.querySelector("td");
    if (th && td) addSpec(specs, th.textContent ?? "", td.textContent ?? "");
  }

  // 2) Detail bullets ("Marca: X", "Cor: Y" ...)
  const bulletContainer =
    doc.querySelector("#detailBullets_feature_div") ?? doc.querySelector("#detailBulletsWrapper_feature_div");
  if (bulletContainer) {
    for (const li of Array.from(bulletContainer.querySelectorAll("li"))) {
      const label = li.querySelector(".a-text-bold");
      if (label) {
        const full = cleanText(li.textContent);
        const key = cleanText(label.textContent);
        addSpec(specs, key, full.replace(key, "").replace(/^[:\s]+/, ""));
      } else {
        const text = cleanText(li.textContent);
        const idx = text.indexOf(":");
        if (idx > 0 && idx < 60) addSpec(specs, text.slice(0, idx), text.slice(idx + 1));
      }
    }
  }

  return specs;
}

export const fetchAmazonProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const email = String(context.claims?.email ?? "").toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) throw new Error("Recurso exclusivo da administração.");

    const url = data.url.trim();
    if (!/amazon\./i.test(url) && !/amzn\./i.test(url)) {
      throw new Error("Informe um link da Amazon.");
    }

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["FIRECRAWL_API_KEY"];
    if (!lovableKey || !connectionKey) throw new Error("Serviço de leitura de páginas não configurado.");

    const response = await fetch(`${GATEWAY_V2}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
      body: JSON.stringify({
        url,
        formats: [
          "rawHtml",
          { type: "json", schema: PRODUCT_SCHEMA, prompt: "Extraia título, preço atual em reais e todas as URLs de fotos do produto desta página da Amazon." },
        ],
        onlyMainContent: false,
        waitFor: 3000,
        location: { country: "BR", languages: ["pt-BR"] },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Firecrawl falhou [${response.status}]: ${body}`);
      throw new Error(`Não consegui ler a página da Amazon agora (erro ${response.status}). Tente novamente.`);
    }

    const result = await response.json();
    const payload = result?.data && typeof result.data === "object" ? result.data : result;
    const json = payload?.json ?? null;
    const rawHtml: string = typeof payload?.rawHtml === "string" ? payload.rawHtml : "";

    if (!json?.title && !rawHtml) throw new Error("A página não retornou os dados do produto. Confira o link.");

    let description = "";
    let specs: Record<string, string> = {};
    let htmlTitle = "";
    if (rawHtml) {
      const { document } = parseHTML(rawHtml);
      description = extractDescription(document);
      specs = extractSpecs(document);
      htmlTitle = cleanText(document.querySelector("#productTitle")?.textContent);
    }

    // A Amazon carrega a tabela de especificações por demanda; quando o HTML não a traz,
    // usa a leitura inteligente da página como complemento (somente fatos presentes na página).
    if (Object.keys(specs).length === 0 && json?.specs && typeof json.specs === "object") {
      for (const [k, v] of Object.entries(json.specs as Record<string, unknown>)) {
        addSpec(specs, k, String(v));
      }
    }

    const images: string[] = Array.isArray(json?.images)
      ? json.images.filter((u: unknown) => typeof u === "string" && u.startsWith("http"))
      : [];

    return {
      title: String(json?.title ?? htmlTitle ?? ""),
      costPrice: Number(json?.price) || 0,
      description,
      mainImage: images[0] ?? "",
      gallery: images.slice(1),
      specs,
    };
  });

const TREND_SCHEMA = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL do produto na Amazon" },
          title: { type: "string" },
          rating: { type: "number", description: "Nota em estrelas (0 a 5)" },
          reviews: { type: "number", description: "Número de avaliações/comentários" },
          badge: { type: "string", description: "Selo como 'Escolha da Amazon' ou 'Mais vendido', se houver" },
        },
      },
    },
  },
};

export interface AmazonTrendItem {
  url: string;
  title: string;
  rating: number;
  reviews: number;
  badge: string;
}

/**
 * Rastreador de Tendências: pesquisa produtos na Amazon e filtra os vencedores
 * (nota >= 4.5, selo "Escolha da Amazon"/"Mais vendidos" ou alto volume de avaliações).
 */
export const searchAmazonTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        keyword: z.string().trim().min(2).max(120),
        limit: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const email = String(context.claims?.email ?? "").toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) throw new Error("Recurso exclusivo da administração.");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["FIRECRAWL_API_KEY"];
    if (!lovableKey || !connectionKey) throw new Error("Serviço de leitura de páginas não configurado.");

    const response = await fetch(`${GATEWAY_V2}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
      body: JSON.stringify({
        query: `${data.keyword} site:amazon.com.br`,
        limit: Math.min(data.limit * 2, 100),
        lang: "pt-BR",
        country: "BR",
        scrapeOptions: {
          formats: [
            {
              type: "json",
              schema: TREND_SCHEMA,
              prompt:
                "Liste os produtos desta página de resultados da Amazon com url, título, nota em estrelas (rating), número de avaliações (reviews) e selo (badge) como 'Escolha da Amazon' ou 'Mais vendido'. Use somente o que estiver visível na página.",
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Firecrawl search falhou [${response.status}]: ${body}`);
      throw new Error(`Não consegui pesquisar tendências agora (erro ${response.status}). Tente novamente.`);
    }

    const result = await response.json();
    const entries: unknown[] = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];

    const seen = new Set<string>();
    const winners: AmazonTrendItem[] = [];

    const consider = (raw: unknown) => {
      const p = raw as Record<string, unknown>;
      const url = String(p?.url ?? "");
      if (!/amazon\./i.test(url) || seen.has(url)) return;
      const rating = Number(p?.rating) || 0;
      const reviews = Number(p?.reviews) || 0;
      const badge = String(p?.badge ?? "");
      const isWinner =
        rating >= 4.5 ||
        /escolha da amazon|mais vendido|best seller|best-seller/i.test(badge) ||
        reviews >= 1000;
      if (!isWinner) return;
      seen.add(url);
      winners.push({
        url,
        title: String(p?.title ?? ""),
        rating,
        reviews,
        badge,
      });
    };

    for (const entry of entries) {
      const e = entry as Record<string, unknown>;
      // Resultado de busca simples (url direto do resultado)
      if (typeof e?.url === "string" && /amazon\..*\/(dp|gp\/product)\//i.test(e.url)) {
        consider({ url: e.url, title: e.title, rating: 0, reviews: 0, badge: "" });
      }
      // Produtos extraídos da página de resultados
      const list = (e?.json as Record<string, unknown> | undefined)?.products;
      if (Array.isArray(list)) list.forEach(consider);
    }

    // Ordena pelos mais fortes: nota, depois volume de avaliações
    winners.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    return { items: winners.slice(0, data.limit) };
  });
