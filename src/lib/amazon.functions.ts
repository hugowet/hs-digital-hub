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
