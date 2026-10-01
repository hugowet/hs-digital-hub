import { decryptSecret, encryptSecret } from "@/lib/mercado-pago.server";

const CJ_API = "https://developers.cjdropshipping.com/api2.0/v1";

type CjEnvelope<T> = {
  result?: boolean;
  code?: number;
  message?: string;
  data?: T;
};

type CjToken = {
  accessToken: string;
  accessTokenExpiryDate?: string;
  refreshToken?: string;
  refreshTokenExpiryDate?: string;
};

type CjProduct = {
  pid?: string;
  bigImage?: string;
  productNameEn?: string;
  productName?: string;
  productImage?: string;
  productImageSet?: string[];
  categoryName?: string;
  sellPrice?: number | string;
  variants?: Array<{
    vid?: string;
    variantSku?: string;
    variantSellPrice?: number | string;
    variantImage?: string;
  }>;
};

type CjPopularProduct = {
  id?: string;
};

type CjPopularSearch = {
  content?: Array<{ productList?: CjPopularProduct[] }>;
};

const CJ_POPULAR_CATEGORIES = [
  "home decor",
  "electronics",
  "beauty",
  "sports",
  "fashion accessories",
] as const;

const CJ_PRODUCTS_PER_CATEGORY = 3;
let cjLastRequestAt = 0;

async function waitForCjRateLimit() {
  const waitMs = Math.max(0, 1_250 - (Date.now() - cjLastRequestAt));
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  cjLastRequestAt = Date.now();
}

async function cjRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForCjRateLimit();
    const response = await fetch(`${CJ_API}${path}`, {
      ...init,
      headers: {
        "CJ-Access-Token": token,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) as CjEnvelope<T> : {};
    const rateLimited = response.status === 429 || parsed.message?.toLowerCase().includes("too many requests");
    if (rateLimited && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
      continue;
    }
    if (!response.ok || parsed.result === false) {
      throw new Error(`CJ Dropshipping recusou a operação: ${parsed.message ?? response.status}`);
    }
    if (parsed.data === undefined) throw new Error("A CJ Dropshipping retornou uma resposta vazia.");
    return parsed.data;
  }
  throw new Error("A CJ Dropshipping limitou temporariamente a sincronização.");
}

export async function getCjAccessToken(supabaseAdmin: any, storeId: string) {
  const { data: integration } = await supabaseAdmin
    .from("supplier_integrations")
    .select("access_token_encrypted,token_expires_at")
    .eq("store_id", storeId)
    .eq("provider", "cj")
    .maybeSingle();

  if (integration?.access_token_encrypted && integration.token_expires_at
      && new Date(integration.token_expires_at).getTime() > Date.now() + 5 * 60_000) {
    return decryptSecret(integration.access_token_encrypted);
  }

  const apiKey = process.env["CJ_DROPSHIPPING_API_KEY"];
  if (!apiKey) throw new Error("A chave da CJ Dropshipping ainda não está configurada.");
  const token = await cjRequest<CjToken>("/authentication/getAccessToken", "", {
    method: "POST",
    headers: { "CJ-Access-Token": "" },
    body: JSON.stringify({ apiKey }),
  });
  if (!token.accessToken) throw new Error("A CJ Dropshipping não emitiu o acesso esperado.");

  const expiresAt = token.accessTokenExpiryDate
    ? new Date(token.accessTokenExpiryDate).toISOString()
    : new Date(Date.now() + 179 * 24 * 60 * 60_000).toISOString();
  await supabaseAdmin.from("supplier_integrations").update({
    access_token_encrypted: await encryptSecret(token.accessToken),
    refresh_token_encrypted: token.refreshToken ? await encryptSecret(token.refreshToken) : null,
    token_expires_at: expiresAt,
    status: "active",
    last_error: null,
  }).eq("store_id", storeId).eq("provider", "cj");
  return token.accessToken;
}

function categoryFor(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("home") || normalized.includes("house") || normalized.includes("office")) return "casa-setup";
  if (normalized.includes("keyboard") || normalized.includes("mouse") || normalized.includes("computer")) return "perifericos-acessorios";
  if (normalized.includes("sport")) return "esportes";
  if (normalized.includes("beauty")) return "beleza";
  if (normalized.includes("kid") || normalized.includes("toy")) return "infantil";
  if (normalized.includes("fashion") || normalized.includes("clothing")) return "moda";
  return "eletronicos-gadgets";
}

export async function syncCjCatalog(supabaseAdmin: any, storeId: string, marginPercent: number) {
  const token = await getCjAccessToken(supabaseAdmin, storeId);
  const productIds = new Set<string>();

  for (const keyword of CJ_POPULAR_CATEGORIES) {
    const params = new URLSearchParams({
      page: "1",
      size: String(CJ_PRODUCTS_PER_CATEGORY),
      keyWord: keyword,
      orderBy: "1",
      sort: "desc",
    });
    const search = await cjRequest<CjPopularSearch>(`/product/listV2?${params.toString()}`, token);
    for (const group of search.content ?? []) {
      for (const product of group.productList ?? []) {
        if (product.id) productIds.add(product.id);
      }
    }
  }

  let imported = 0;
  let skipped = 0;

  for (const productId of productIds) {
    try {
      const product = await cjRequest<CjProduct>(`/product/query?pid=${encodeURIComponent(productId)}`, token);
      const variant = product.variants?.[0];
      const pid = product.pid;
      const vid = variant?.vid;
      const title = (product.productNameEn ?? product.productName ?? "").trim();
      const cost = Number(variant?.variantSellPrice ?? product.sellPrice);
      if (!pid || !vid || !title || !Number.isFinite(cost) || cost <= 0) {
        skipped += 1;
        continue;
      }
      const images = [variant?.variantImage, product.bigImage, product.productImage, ...(product.productImageSet ?? [])]
        .filter((value): value is string => Boolean(value?.startsWith("https://")));
      const price = Math.round(cost * (1 + marginPercent / 100) * 100) / 100;
      const { error } = await supabaseAdmin.from("products").upsert({
        store_id: storeId,
        title: title.slice(0, 160),
        description: "Produto popular da CJ Dropshipping, selecionado entre os mais vendidos da categoria.",
        description_long: "Produto real do catálogo CJ Dropshipping, com estoque sincronizado pelo fornecedor.",
        price,
        stock: 0,
        category: categoryFor(`${product.categoryName ?? ""} ${title}`),
        image_url: images[0] ?? null,
        gallery_urls: [...new Set(images)].slice(0, 10),
        product_type: "physical",
        is_active: true,
        supplier: "cj",
        supplier_product_id: pid,
        supplier_variant_id: vid,
        supplier_sku: variant.variantSku ?? null,
        supplier_cost: cost,
        supplier_last_synced_at: new Date().toISOString(),
      }, { onConflict: "store_id,supplier,supplier_variant_id" });
      if (error) throw error;
      imported += 1;
    } catch {
      skipped += 1;
    }
  }

  await supabaseAdmin.from("supplier_integrations").update({
    last_catalog_sync_at: new Date().toISOString(),
    last_error: null,
  }).eq("store_id", storeId).eq("provider", "cj");
  return { imported, skipped, categories: CJ_POPULAR_CATEGORIES.length };
}

export async function syncCjStock(supabaseAdmin: any, storeId: string) {
  const token = await getCjAccessToken(supabaseAdmin, storeId);
  const { data: products } = await supabaseAdmin.from("products")
    .select("id,supplier_variant_id")
    .eq("store_id", storeId).eq("supplier", "cj").not("supplier_variant_id", "is", null);
  let updated = 0;
  for (const product of products ?? []) {
    const stockData = await cjRequest<any>("/product/stock/queryByVid", token, {
      method: "POST",
      body: JSON.stringify({ vid: product.supplier_variant_id }),
    });
    const rows = Array.isArray(stockData) ? stockData : [stockData];
    const stock = rows.reduce((sum, row) => sum + Math.max(0, Number(row?.storageNum ?? row?.totalInventory ?? 0)), 0);
    await supabaseAdmin.from("products").update({
      stock,
      is_active: true,
      supplier_last_synced_at: new Date().toISOString(),
    }).eq("id", product.id);
    updated += 1;
  }
  await supabaseAdmin.from("supplier_integrations").update({
    last_stock_sync_at: new Date().toISOString(), last_error: null,
  }).eq("store_id", storeId).eq("provider", "cj");
  return { updated };
}

function addressValue(address: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function submitCjFulfillment(supabaseAdmin: any, fulfillmentId: string) {
  const { data: fulfillment } = await supabaseAdmin.from("supplier_fulfillments")
    .select("id,order_id,store_id,status,external_order_id")
    .eq("id", fulfillmentId).eq("provider", "cj").maybeSingle();
  if (!fulfillment) throw new Error("Envio CJ não encontrado.");
  if (fulfillment.external_order_id || ["submitted", "shipped", "delivered"].includes(fulfillment.status)) return fulfillment;

  const [{ data: order }, { data: items }] = await Promise.all([
    supabaseAdmin.from("orders").select("shipping_address").eq("id", fulfillment.order_id).single(),
    supabaseAdmin.from("order_items").select("quantity,products!inner(supplier_variant_id)")
      .eq("order_id", fulfillment.order_id).eq("store_id", fulfillment.store_id).eq("products.supplier", "cj"),
  ]);
  const address = (order?.shipping_address ?? {}) as Record<string, unknown>;
  const products = (items ?? []).map((item: any) => ({
    vid: item.products?.supplier_variant_id,
    quantity: item.quantity,
  })).filter((item: any) => item.vid);
  if (products.length === 0) throw new Error("O pedido não possui variantes CJ válidas.");

  const payload = {
    orderNumber: `HS-${fulfillment.order_id}-${fulfillment.store_id}`,
    shippingName: addressValue(address, "name", "recipient_name"),
    shippingCountryCode: "BR",
    shippingCountry: "Brazil",
    shippingProvince: addressValue(address, "state"),
    shippingCity: addressValue(address, "city"),
    shippingAddress: addressValue(address, "address", "street_address"),
    shippingZip: addressValue(address, "postal_code", "zip").replace(/\D/g, ""),
    shippingPhone: addressValue(address, "phone").replace(/\D/g, ""),
    fromCountryCode: "CN",
    logisticName: "CJPacket Ordinary",
    products,
  };
  if (!payload.shippingName || !payload.shippingCity || !payload.shippingAddress || !payload.shippingZip || !payload.shippingPhone) {
    throw new Error("O endereço do comprador está incompleto para envio pela CJ.");
  }

  const token = await getCjAccessToken(supabaseAdmin, fulfillment.store_id);
  const result = await cjRequest<any>("/shopping/order/createOrder", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const externalOrderId = String(result?.orderId ?? result?.id ?? result?.orderNumber ?? "");
  if (!externalOrderId) throw new Error("A CJ não retornou o identificador do pedido.");
  const { data: updated, error } = await supabaseAdmin.from("supplier_fulfillments").update({
    status: "submitted",
    external_order_id: externalOrderId,
    request_payload: payload,
    provider_payload: result,
    submitted_at: new Date().toISOString(),
    attempts: 1,
    last_error: null,
  }).eq("id", fulfillment.id).is("external_order_id", null).select().maybeSingle();
  if (error) throw error;
  return updated ?? fulfillment;
}
