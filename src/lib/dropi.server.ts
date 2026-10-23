import { categoryFor } from "@/lib/suppliers.server";

export type DropiFieldMapping = {
  items: string;
  id: string;
  variantId: string;
  sku: string;
  title: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  image: string;
  images: string;
};

export type DropiConfiguration = {
  storeId: string;
  apiBaseUrl: string;
  integratorId: string;
  productEndpoint: string;
  marginPercent: number;
  mapping: DropiFieldMapping;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_IMPORT_ITEMS = 2_000;

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized.endsWith(".local")) return true;
  if (normalized === "::1" || normalized === "0.0.0.0") return true;
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && typeof b === "number" && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function validateDropiUrl(baseUrl: string, endpoint: string) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || isPrivateHostname(parsed.hostname)) {
    throw new Error("Informe uma URL HTTPS pública e segura para a API do Dropi.");
  }
  if (!endpoint.startsWith("/") || endpoint.length > 500 || /\s/.test(endpoint)) {
    throw new Error("O caminho de produtos deve começar com / e não pode conter espaços.");
  }
  return new URL(endpoint, `${parsed.origin}/`).toString();
}

function readPath(source: unknown, path: string): unknown {
  if (!path.trim()) return source;
  return path.split(".").reduce<unknown>((value, part) => {
    if (value === null || typeof value !== "object") return undefined;
    if (Array.isArray(value)) {
      const index = Number(part);
      return Number.isInteger(index) ? value[index] : undefined;
    }
    return (value as Record<string, unknown>)[part];
  }, source);
}

function asText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function asImages(primary: unknown, collection: unknown) {
  const values = [
    asText(primary),
    ...(Array.isArray(collection) ? collection.map(asText) : asText(collection).split(",")),
  ];
  return [...new Set(values.filter((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }))].slice(0, 10);
}

async function dropiRequest(configuration: DropiConfiguration) {
  const token = process.env["DROPI_API_KEY"];
  if (!token) throw new Error("O token do Dropi ainda não está configurado no servidor.");
  const url = validateDropiUrl(configuration.apiBaseUrl, configuration.productEndpoint);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-API-Key": token,
        "X-Integrator-Id": configuration.integratorId,
      },
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`O Dropi recusou a conexão [${response.status}]: ${body.slice(0, 500)}`);
    }
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new Error("O Dropi não retornou uma resposta JSON válida.");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A API do Dropi não respondeu em até 15 segundos.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mappedProducts(payload: unknown, mapping: DropiFieldMapping) {
  const items = readPath(payload, mapping.items);
  if (!Array.isArray(items)) {
    throw new Error(`O campo mapeado para a lista de produtos (“${mapping.items}”) não é uma lista.`);
  }
  return items.slice(0, MAX_IMPORT_ITEMS).map((item) => {
    const id = asText(readPath(item, mapping.id));
    const variantId = asText(readPath(item, mapping.variantId)) || id;
    const title = asText(readPath(item, mapping.title));
    const price = Number(readPath(item, mapping.price));
    const stock = Math.max(0, Math.floor(Number(readPath(item, mapping.stock)) || 0));
    const category = asText(readPath(item, mapping.category));
    const images = asImages(readPath(item, mapping.image), readPath(item, mapping.images));
    return {
      id,
      variantId,
      sku: asText(readPath(item, mapping.sku)),
      title,
      description: asText(readPath(item, mapping.description)),
      price,
      stock,
      category,
      images,
    };
  });
}

export async function testDropiConnection(configuration: DropiConfiguration) {
  const payload = await dropiRequest(configuration);
  const products = mappedProducts(payload, configuration.mapping);
  const valid = products.filter((product) => product.id && product.variantId && product.title && Number.isFinite(product.price) && product.price > 0);
  if (products.length > 0 && valid.length === 0) {
    throw new Error("A conexão funcionou, mas o mapeamento não encontrou identificador, nome e preço válidos.");
  }
  return { received: products.length, valid: valid.length, sampleTitle: valid[0]?.title ?? null };
}

export async function syncDropiCatalog(supabaseAdmin: any, configuration: DropiConfiguration) {
  const payload = await dropiRequest(configuration);
  const products = mappedProducts(payload, configuration.mapping);
  let imported = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const product of products) {
    if (!product.id || !product.variantId || !product.title || !Number.isFinite(product.price) || product.price <= 0 || seen.has(product.variantId)) {
      skipped += 1;
      continue;
    }
    seen.add(product.variantId);
    const salePrice = calculateFinalPrice(product.price);
    const productData = {
      store_id: configuration.storeId,
      title: product.title.slice(0, 160),
      description: product.description.slice(0, 1000) || "Produto real do fornecedor Dropi Nacional.",
      description_long: product.description.slice(0, 5000) || "Produto real com estoque sincronizado pelo fornecedor Dropi Nacional.",
      price: salePrice,
      stock: product.stock,
      category: categoryFor(`${product.category} ${product.title}`),
      image_url: product.images[0] ?? null,
      gallery_urls: product.images,
      product_type: "physical",
      is_active: true,
      supplier: "dropi",
      supplier_product_id: product.id,
      supplier_variant_id: product.variantId,
      supplier_sku: product.sku || null,
      supplier_cost: product.price,
      supplier_last_synced_at: new Date().toISOString(),
    };
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("store_id", configuration.storeId)
      .eq("supplier", "dropi")
      .eq("supplier_variant_id", product.variantId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    const { error } = existing
      ? await supabaseAdmin.from("products").update(productData).eq("id", existing.id)
      : await supabaseAdmin.from("products").insert(productData);
    if (error) throw error;
    imported += 1;
  }

  await supabaseAdmin.from("supplier_integrations").update({
    status: "active",
    last_catalog_sync_at: new Date().toISOString(),
    last_stock_sync_at: new Date().toISOString(),
    last_error: null,
  }).eq("store_id", configuration.storeId).eq("provider", "dropi");
  return { imported, skipped, received: products.length };
}