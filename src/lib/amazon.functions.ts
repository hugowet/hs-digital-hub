import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_EMAILS = ["hugoet373@gmail.com", "hugohug12ou@gmail.com"];
const GATEWAY_V2 = "https://connector-gateway.lovable.dev/firecrawl/v2";

const PRODUCT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título completo do produto" },
    price: { type: "number", description: "Preço atual de venda em reais (apenas o número, sem símbolo)" },
    description: { type: "string", description: "Descrição e principais benefícios do produto" },
    images: { type: "array", items: { type: "string" }, description: "URLs das fotos do produto (m.media-amazon.com)" },
    specs: { type: "object", description: "Especificações técnicas (marca, modelo, dimensões, voltagem etc.)" },
  },
};

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
        formats: [{ type: "json", schema: PRODUCT_SCHEMA, prompt: "Extraia os dados do produto desta página da Amazon." }],
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
    const json = result?.json ?? result?.data?.json ?? null;
    if (!json || !json.title) throw new Error("A página não retornou os dados do produto. Confira o link.");

    const images: string[] = Array.isArray(json.images)
      ? json.images.filter((u: unknown) => typeof u === "string" && u.startsWith("http"))
      : [];

    return {
      title: String(json.title ?? ""),
      costPrice: Number(json.price) || 0,
      description: String(json.description ?? ""),
      mainImage: images[0] ?? "",
      gallery: images.slice(1),
      specs: json.specs && typeof json.specs === "object" ? json.specs : {},
    };
  });
