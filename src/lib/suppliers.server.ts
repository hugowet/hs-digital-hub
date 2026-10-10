import { decryptSecret, encryptSecret } from "@/lib/mercado-pago.server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai-run-id.server";

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
  warehouseInventoryNum?: number;
  totalVerifiedInventory?: number;
};

type CjPopularSearch = {
  content?: Array<{ productList?: CjPopularProduct[] }>;
};

type CjCategoryTree = Array<{
  categoryFirstName?: string;
  categoryFirstList?: Array<{
    categorySecondName?: string;
    categorySecondList?: Array<{ categoryId?: string; categoryName?: string }>;
  }>;
}>;

type QueuedCjProduct = { id: string; stock: number };

const CJ_PRODUCTS_PER_CATEGORY = 20;
const CJ_REQUESTS_PER_BATCH = 21;
const CJ_LOCK_MS = 45_000;
let cjLastRequestAt = 0;

type BrlExchangeRate = { rate: number; quotedAt: string };

function parseTranslations(content: string, expected: number) {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(cleaned) as { translations?: unknown };
  if (!Array.isArray(parsed.translations) || parsed.translations.length !== expected)
    throw new Error("A tradução retornou uma quantidade inesperada de títulos.");
  return parsed.translations.map((value) => String(value).trim().slice(0, 160));
}

async function translateProductTitles(titles: string[]) {
  if (titles.length === 0) return [];
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("A tradução automática ainda não está disponível.");
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions:
      "Traduza títulos de produtos de e-commerce do inglês para português do Brasil. Preserve marcas, modelos, medidas e siglas. Não invente características. Responda somente JSON válido no formato {\"translations\":[\"...\"]}, mantendo exatamente a ordem e a quantidade.",
    messages: [{ role: "user", content: JSON.stringify(titles) }],
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const content = await result.text;
  if (!content) throw new Error("A tradução automática retornou uma resposta vazia.");
  return parseTranslations(content, titles.length);
}

export async function translateCjProductBatch(
  supabaseAdmin: any,
  batchSize = 50,
  idRange?: { start: string; end?: string },
) {
  const safeBatchSize = Math.min(50, Math.max(1, Math.trunc(batchSize)));
  let query = supabaseAdmin
    .from("products")
    .select("id,title,supplier_title_original")
    .eq("supplier", "cj")
    .neq("supplier_locale", "pt-BR")
    .order("id")
    .limit(safeBatchSize);
  if (idRange) {
    query = query.gte("id", idRange.start);
    if (idRange.end) query = query.lt("id", idRange.end);
  }
  const { data: products, error } = await query;
  if (error) throw error;
  if (!products?.length) return { translated: 0, remaining: 0 };
  const originals = products.map((product: any) =>
    String(product.supplier_title_original ?? product.title).trim(),
  );
  const translated = await translateProductTitles(originals);
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const title = translated[index];
    if (!product || !title) continue;
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        title,
        supplier_title_original: product.supplier_title_original ?? product.title,
        supplier_locale: "pt-BR",
      })
      .eq("id", product.id);
    if (updateError) throw updateError;
  }
  let countQuery = supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("supplier", "cj")
    .neq("supplier_locale", "pt-BR");
  if (idRange) {
    countQuery = countQuery.gte("id", idRange.start);
    if (idRange.end) countQuery = countQuery.lt("id", idRange.end);
  }
  const { count } = await countQuery;
  return { translated: translated.length, remaining: count ?? 0 };
}

function bcbDate(date: Date) {
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}-${date.getUTCFullYear()}`;
}

async function getUsdBrlRate(supabaseAdmin: any, storeId: string): Promise<BrlExchangeRate> {
  const end = new Date();
  const start = new Date(end.getTime() - 10 * 24 * 60 * 60_000);
  const params = new URLSearchParams({
    "@dataInicial": `'${bcbDate(start)}'`,
    "@dataFinalCotacao": `'${bcbDate(end)}'`,
    "$top": "1",
    "$orderby": "dataHoraCotacao desc",
    "$format": "json",
  });

  try {
    const response = await fetch(
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?${params.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as {
      value?: Array<{ cotacaoVenda?: number; dataHoraCotacao?: string }>;
    };
    const quote = payload.value?.[0];
    const rate = Number(quote?.cotacaoVenda);
    if (!Number.isFinite(rate) || rate < 2 || rate > 15)
      throw new Error("Cotação fora da faixa segura.");
    return {
      rate,
      quotedAt: quote?.dataHoraCotacao
        ? new Date(`${quote.dataHoraCotacao.replace(" ", "T")}Z`).toISOString()
        : new Date().toISOString(),
    };
  } catch {
    const { data: previous } = await supabaseAdmin
      .from("products")
      .select("supplier_exchange_rate,supplier_exchange_rate_at")
      .eq("store_id", storeId)
      .eq("supplier", "cj")
      .not("supplier_exchange_rate", "is", null)
      .order("supplier_exchange_rate_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const rate = Number(previous?.supplier_exchange_rate);
    const quotedAt = previous?.supplier_exchange_rate_at;
    const age = quotedAt ? Date.now() - new Date(quotedAt).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isFinite(rate) && rate >= 2 && rate <= 15 && age <= 7 * 24 * 60 * 60_000)
      return { rate, quotedAt };
    throw new Error("Não foi possível obter uma cotação USD/BRL segura no Banco Central.");
  }
}

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
    const parsed = text ? (JSON.parse(text) as CjEnvelope<T>) : {};
    const rateLimited =
      response.status === 429 || parsed.message?.toLowerCase().includes("too many requests");
    if (rateLimited && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
      continue;
    }
    if (!response.ok || parsed.result === false) {
      throw new Error(`CJ Dropshipping recusou a operação: ${parsed.message ?? response.status}`);
    }
    if (parsed.data === undefined)
      throw new Error("A CJ Dropshipping retornou uma resposta vazia.");
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

  if (
    integration?.access_token_encrypted &&
    integration.token_expires_at &&
    new Date(integration.token_expires_at).getTime() > Date.now() + 5 * 60_000
  ) {
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
  await supabaseAdmin
    .from("supplier_integrations")
    .update({
      access_token_encrypted: await encryptSecret(token.accessToken),
      refresh_token_encrypted: token.refreshToken ? await encryptSecret(token.refreshToken) : null,
      token_expires_at: expiresAt,
      status: "active",
      last_error: null,
    })
    .eq("store_id", storeId)
    .eq("provider", "cj");
  return token.accessToken;
}

export function categoryFor(name: string) {
  const normalized = name.toLowerCase();
  if (
    [
      "cell phone",
      "mobile phone",
      "smartphone",
      "television",
      "smart tv",
    ].some((term) => normalized.includes(term))
  )
    return "celulares-tv";
  if (
    [
      "smart watch",
      "smartwatch",
      "earphone",
      "headphone",
      "headset",
      "bluetooth",
      "speaker",
      "portable audio",
      "wearable",
    ].some((term) => normalized.includes(term))
  )
    return "eletronicos-gadgets";
  if (["kid", "toy", "baby", "child"].some((term) => normalized.includes(term))) return "infantil";
  if (
    ["beauty", "makeup", "cosmetic", "skin care", "hair"].some((term) => normalized.includes(term))
  )
    return "beleza";
  if (
    ["fashion", "clothing", "jewelry", "necklace", "bracelet", "watch", "bag"].some((term) =>
      normalized.includes(term),
    )
  )
    return "moda";
  if (["sport", "fitness", "gym", "outdoor", "camping"].some((term) => normalized.includes(term)))
    return "esportes";
  if (
    [
      "keyboard",
      "mouse",
      "computer",
      "laptop",
      "headset",
      "usb",
      "phone accessory",
      "phone case",
      "screen protector",
      "charger",
      "power bank",
    ].some((term) => normalized.includes(term))
  )
    return "perifericos-acessorios";
  if (
    [
      "automobile",
      "automotive",
      "motorcycle",
      "motorbike",
      "car part",
      "auto part",
      "vehicle",
      "car accessory",
    ].some((term) => normalized.includes(term))
  )
    return "autos-motos";
  if (
    [
      "power tool",
      "hand tool",
      "electric drill",
      "hammer drill",
      "rotary hammer",
      "impact drill",
      "screwdriver",
      "grinder",
      "saw",
      "tool",
    ].some((term) => normalized.includes(term))
  )
    return "ferramentas";
  if (
    [
      "home",
      "house",
      "office",
      "kitchen",
      "garden",
      "decor",
    ].some((term) => normalized.includes(term))
  )
    return "casa-setup";
  if (
    [
      "pet",
      "dog",
      "cat",
      "travel",
    ].some((term) => normalized.includes(term))
  )
    return "mercado";
  return "eletronicos-gadgets";
}

function priorityForCjCategory(path: string) {
  const normalized = path.toLowerCase();
  if (
    [
      "power tool",
      "hand tool",
      "electric drill",
      "hammer drill",
      "rotary hammer",
      "cell phone",
      "mobile phone",
      "smartphone",
      "television",
      "automobiles & motorcycles",
      "auto replacement parts",
      "motorcycle accessories & parts",
      "car electronics",
    ].some((term) => normalized.includes(term))
  )
    return 120;
  if (
    [
      "earphone",
      "headphone",
      "headset",
      "bluetooth",
      "smart watch",
      "smartwatch",
      "speaker",
      "portable audio",
      "wearable",
    ].some((term) => normalized.includes(term))
  )
    return 100;
  if (
    ["consumer electronics", "phone accessories", "computer accessories", "electronic"].some(
      (term) => normalized.includes(term),
    )
  )
    return 50;
  return 0;
}

function flattenCjCategories(tree: CjCategoryTree) {
  return tree.flatMap((first) =>
    (first.categoryFirstList ?? []).flatMap((second) =>
      (second.categorySecondList ?? []).flatMap((third) => {
        if (!third.categoryId || !third.categoryName) return [];
        return [
          {
            category_id: third.categoryId,
            category_name: third.categoryName,
            category_path: [first.categoryFirstName, second.categorySecondName, third.categoryName]
              .filter(Boolean)
              .join(" / "),
          },
        ];
      }),
    ),
  );
}

export async function startCjCatalogImport(supabaseAdmin: any, storeId: string) {
  const token = await getCjAccessToken(supabaseAdmin, storeId);
  const tree = await cjRequest<CjCategoryTree>("/product/getCategory", token);
  const categories = flattenCjCategories(tree);
  if (categories.length === 0) throw new Error("A CJ não retornou categorias para importar.");

  const rows = categories.map((category) => ({
    store_id: storeId,
    provider: "cj",
    ...category,
    priority: priorityForCjCategory(category.category_path),
    status: "pending",
    product_ids: [],
    next_product_index: 0,
    imported_count: 0,
    last_error: null,
    completed_at: null,
  }));
  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await supabaseAdmin
      .from("supplier_catalog_categories")
      .upsert(rows.slice(index, index + 100), { onConflict: "store_id,provider,category_id" });
    if (error) throw error;
  }

  const { error } = await supabaseAdmin.from("supplier_import_jobs").upsert(
    {
      store_id: storeId,
      provider: "cj",
      status: "pending",
      total_categories: categories.length,
      completed_categories: 0,
      imported_products: 0,
      skipped_products: 0,
      lock_expires_at: null,
      pause_reason: null,
      started_at: new Date().toISOString(),
      completed_at: null,
    },
    { onConflict: "store_id,provider" },
  );
  if (error) throw error;
  return { categories: categories.length };
}

async function queueCategoryProducts(token: string, categoryId: string) {
  const params = new URLSearchParams({
    page: "1",
    size: String(CJ_PRODUCTS_PER_CATEGORY),
    categoryId,
    orderBy: "1",
    sort: "desc",
  });
  const search = await cjRequest<CjPopularSearch>(`/product/listV2?${params.toString()}`, token);
  const products = new Map<string, QueuedCjProduct>();
  for (const group of search.content ?? []) {
    for (const product of group.productList ?? []) {
      if (product.id)
        products.set(product.id, {
          id: product.id,
          stock: Math.max(
            0,
            Number(product.warehouseInventoryNum ?? product.totalVerifiedInventory ?? 0),
          ),
        });
    }
  }
  return [...products.values()].slice(0, CJ_PRODUCTS_PER_CATEGORY);
}

async function importCjProduct(
  supabaseAdmin: any,
  storeId: string,
  marginPercent: number,
  exchange: BrlExchangeRate,
  token: string,
  queued: QueuedCjProduct,
) {
  const product = await cjRequest<CjProduct>(
    `/product/query?pid=${encodeURIComponent(queued.id)}`,
    token,
  );
  const variant = product.variants?.[0];
  const pid = product.pid;
  const vid = variant?.vid;
  const title = (product.productNameEn ?? product.productName ?? "").trim();
  const cost = Number(variant?.variantSellPrice ?? product.sellPrice);
  if (!pid || !vid || !title || !Number.isFinite(cost) || cost <= 0) return false;
  const images = [
    variant?.variantImage,
    product.bigImage,
    product.productImage,
    ...(product.productImageSet ?? []),
  ].filter((value): value is string => Boolean(value?.startsWith("https://")));
  const price = Math.round(cost * exchange.rate * (1 + marginPercent / 100) * 100) / 100;
  const productData = {
    store_id: storeId,
    title: title.slice(0, 160),
    supplier_title_original: title.slice(0, 160),
    supplier_locale: "en",
    description:
      "Produto real da CJ Dropshipping, selecionado entre os mais procurados da categoria.",
    description_long:
      "Produto real do catálogo CJ Dropshipping, com estoque sincronizado pelo fornecedor.",
    price,
    stock: queued.stock,
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
    supplier_cost_currency: "USD",
    supplier_exchange_rate: exchange.rate,
    supplier_exchange_rate_at: exchange.quotedAt,
    supplier_last_synced_at: new Date().toISOString(),
  };
  const { data: existingProduct, error: lookupError } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("supplier", "cj")
    .eq("supplier_variant_id", vid)
    .maybeSingle();
  if (lookupError) throw lookupError;
  const { error } = existingProduct
    ? await supabaseAdmin.from("products").update(productData).eq("id", existingProduct.id)
    : await supabaseAdmin.from("products").insert(productData);
  if (error) throw error;
  return true;
}

export async function processCjCatalogBatch(
  supabaseAdmin: any,
  storeId: string,
  marginPercent: number,
  exchange: BrlExchangeRate,
) {
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + CJ_LOCK_MS).toISOString();
  const { data: claimed } = await supabaseAdmin
    .from("supplier_import_jobs")
    .update({ status: "running", lock_expires_at: lockExpiresAt, pause_reason: null })
    .eq("store_id", storeId)
    .eq("provider", "cj")
    .in("status", ["pending", "running"])
    .or(`lock_expires_at.is.null,lock_expires_at.lt.${now.toISOString()}`)
    .select("id,total_categories,completed_categories,imported_products,skipped_products")
    .maybeSingle();
  if (!claimed) return { busy: true, done: false, imported: 0, skipped: 0 };

  let imported = 0;
  let skipped = 0;
  try {
    const token = await getCjAccessToken(supabaseAdmin, storeId);
    const { data: activeCategory } = await supabaseAdmin
      .from("supplier_catalog_categories")
      .select("id,category_id,product_ids,next_product_index,imported_count")
      .eq("store_id", storeId)
      .eq("provider", "cj")
      .eq("status", "processing")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const { data: pendingCategory } = activeCategory
      ? { data: null }
      : await supabaseAdmin
          .from("supplier_catalog_categories")
          .select("id,category_id,product_ids,next_product_index,imported_count")
          .eq("store_id", storeId)
          .eq("provider", "cj")
          .eq("status", "pending")
          .order("priority", { ascending: false })
          .order("created_at")
          .limit(1)
          .maybeSingle();
    const category = activeCategory ?? pendingCategory;

    if (!category) {
      await supabaseAdmin
        .from("supplier_import_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          lock_expires_at: null,
        })
        .eq("id", claimed.id);
      return { busy: false, done: true, imported: 0, skipped: 0 };
    }

    let queued = Array.isArray(category.product_ids)
      ? (category.product_ids as QueuedCjProduct[])
      : [];
    let requestCount = 0;
    if (queued.length === 0) {
      queued = await queueCategoryProducts(token, category.category_id);
      requestCount += 1;
      await supabaseAdmin
        .from("supplier_catalog_categories")
        .update({
          status: "processing",
          product_ids: queued,
          next_product_index: 0,
        })
        .eq("id", category.id);
    }

    let nextIndex = category.next_product_index;
    while (nextIndex < queued.length && requestCount < CJ_REQUESTS_PER_BATCH) {
      const queuedProduct = queued[nextIndex];
      if (!queuedProduct) break;
      try {
        const wasImported = await importCjProduct(
          supabaseAdmin,
          storeId,
          marginPercent,
          exchange,
          token,
          queuedProduct,
        );
        if (wasImported) imported += 1;
        else skipped += 1;
      } catch (error) {
        skipped += 1;
        await supabaseAdmin
          .from("supplier_catalog_categories")
          .update({
            last_error: (error instanceof Error
              ? error.message
              : "Falha ao importar produto."
            ).slice(0, 1000),
          })
          .eq("id", category.id);
      }
      requestCount += 1;
      nextIndex += 1;
      await supabaseAdmin
        .from("supplier_catalog_categories")
        .update({
          next_product_index: nextIndex,
          imported_count: category.imported_count + imported,
        })
        .eq("id", category.id);
    }

    let completedCategories = claimed.completed_categories;
    if (nextIndex >= queued.length) {
      completedCategories += 1;
      await supabaseAdmin
        .from("supplier_catalog_categories")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", category.id);
    }
    const done = completedCategories >= claimed.total_categories;
    await supabaseAdmin
      .from("supplier_import_jobs")
      .update({
        status: done ? "completed" : "pending",
        completed_categories: completedCategories,
        imported_products: claimed.imported_products + imported,
        skipped_products: claimed.skipped_products + skipped,
        lock_expires_at: null,
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq("id", claimed.id);
    await supabaseAdmin
      .from("supplier_integrations")
      .update({
        last_catalog_sync_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("store_id", storeId)
      .eq("provider", "cj");
    return {
      busy: false,
      done,
      imported,
      skipped,
      completedCategories,
      totalCategories: claimed.total_categories,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na sincronização da CJ.";
    await supabaseAdmin
      .from("supplier_import_jobs")
      .update({
        status: "paused",
        pause_reason: message.slice(0, 1000),
        lock_expires_at: null,
      })
      .eq("id", claimed.id);
    await supabaseAdmin
      .from("supplier_integrations")
      .update({ last_error: message.slice(0, 1000) })
      .eq("store_id", storeId)
      .eq("provider", "cj");
    throw error;
  }
}

export async function syncCjCatalog(supabaseAdmin: any, storeId: string, marginPercent: number) {
  const exchange = await getUsdBrlRate(supabaseAdmin, storeId);
  const { data: repriced, error: repriceError } = await supabaseAdmin.rpc(
    "reprice_cj_products_brl",
    {
      _store_id: storeId,
      _usd_brl_rate: exchange.rate,
      _margin_percent: marginPercent,
    },
  );
  if (repriceError) throw repriceError;
  const { data: job } = await supabaseAdmin
    .from("supplier_import_jobs")
    .select("id,status")
    .eq("store_id", storeId)
    .eq("provider", "cj")
    .maybeSingle();
  if (!job || job.status === "completed" || job.status === "failed") {
    await startCjCatalogImport(supabaseAdmin, storeId);
  } else if (job.status === "paused") {
    await supabaseAdmin
      .from("supplier_import_jobs")
      .update({ status: "pending", pause_reason: null })
      .eq("id", job.id);
  }
  const batch = await processCjCatalogBatch(supabaseAdmin, storeId, marginPercent, exchange);
  return { ...batch, repriced: Number(repriced ?? 0), usdBrlRate: exchange.rate };
}

export async function syncCjStock(supabaseAdmin: any, storeId: string) {
  const token = await getCjAccessToken(supabaseAdmin, storeId);
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id,supplier_variant_id")
    .eq("store_id", storeId)
    .eq("supplier", "cj")
    .not("supplier_variant_id", "is", null);
  let updated = 0;
  for (const product of products ?? []) {
    const stockData = await cjRequest<any>(
      `/product/stock/queryByVid?vid=${encodeURIComponent(product.supplier_variant_id)}`,
      token,
    );
    const rows = Array.isArray(stockData) ? stockData : [stockData];
    const stock = rows.reduce(
      (sum, row) => sum + Math.max(0, Number(row?.storageNum ?? row?.totalInventory ?? 0)),
      0,
    );
    await supabaseAdmin
      .from("products")
      .update({
        stock,
        is_active: true,
        supplier_last_synced_at: new Date().toISOString(),
      })
      .eq("id", product.id);
    updated += 1;
  }
  await supabaseAdmin
    .from("supplier_integrations")
    .update({
      last_stock_sync_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("store_id", storeId)
    .eq("provider", "cj");
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
  const { data: fulfillment } = await supabaseAdmin
    .from("supplier_fulfillments")
    .select("id,order_id,store_id,status,external_order_id")
    .eq("id", fulfillmentId)
    .eq("provider", "cj")
    .maybeSingle();
  if (!fulfillment) throw new Error("Envio CJ não encontrado.");
  if (
    fulfillment.external_order_id ||
    ["submitted", "shipped", "delivered"].includes(fulfillment.status)
  )
    return fulfillment;

  const [{ data: order }, { data: items }, { data: shipment }] = await Promise.all([
    supabaseAdmin.from("orders").select("shipping_address").eq("id", fulfillment.order_id).single(),
    supabaseAdmin
      .from("order_items")
      .select("quantity,products!inner(supplier_variant_id)")
      .eq("order_id", fulfillment.order_id)
      .eq("store_id", fulfillment.store_id)
      .eq("products.supplier", "cj"),
    supabaseAdmin
      .from("order_shipments")
      .select("service_code,service_name,amount")
      .eq("order_id", fulfillment.order_id)
      .eq("store_id", fulfillment.store_id)
      .maybeSingle(),
  ]);
  const address = (order?.shipping_address ?? {}) as Record<string, unknown>;
  const products = (items ?? [])
    .map((item: any) => ({
      vid: item.products?.supplier_variant_id,
      quantity: item.quantity,
    }))
    .filter((item: any) => item.vid);
  if (products.length === 0) throw new Error("O pedido não possui variantes CJ válidas.");

  const payload = {
    orderNumber: `HS-${fulfillment.order_id}-${fulfillment.store_id}`,
    shippingCustomerName: addressValue(address, "name", "recipient_name"),
    shippingCountryCode: "BR",
    shippingCountry: "BR",
    shippingProvince: addressValue(address, "state"),
    shippingCity: addressValue(address, "city"),
    shippingAddress: addressValue(address, "address", "street_address"),
shippingZip: addressValue(address, "postal_code", "zip").replace(/\D/g, ""),

    shippingPhone: addressValue(address, "phone").replace(/\D/g, ""),
    fromCountryCode: "CN",
    logisticName: shipment?.service_code ?? "",
    payType: 2,
 platform: "other",
storeName: "HS Digital",

    products,
  };
  if (
    !payload.shippingCustomerName ||
    !payload.shippingCity ||
    !payload.shippingAddress ||
    !payload.shippingZip ||
    !payload.shippingPhone ||
    !payload.logisticName
  ) {
    throw new Error("O endereço do comprador está incompleto para envio pela CJ.");
  }

  const token = await getCjAccessToken(supabaseAdmin, fulfillment.store_id);
  const result = await cjRequest<any>("/shopping/order/createOrderV2", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const externalOrderId = String(result?.orderId ?? result?.id ?? result?.orderNumber ?? "");
  if (!externalOrderId) throw new Error("A CJ não retornou o identificador do pedido.");
  const { data: updated, error } = await supabaseAdmin
    .from("supplier_fulfillments")
    .update({
      status: "submitted",
      external_order_id: externalOrderId,
      request_payload: payload,
      provider_payload: result,
      submitted_at: new Date().toISOString(),
      shipping_service_code: shipment?.service_code ?? null,
      shipping_service_name: shipment?.service_name ?? null,
      shipping_amount: shipment?.amount ?? null,
      attempts: 1,
      last_error: null,
    })
    .eq("id", fulfillment.id)
    .is("external_order_id", null)
    .select()
    .maybeSingle();
  if (error) throw error;
  return updated ?? fulfillment;
}

export async function dispatchPaidCjFulfillments(supabaseAdmin: any, orderId: string) {
  const { data: fulfillments, error } = await supabaseAdmin
    .from("supplier_fulfillments")
    .select("id")
    .eq("order_id", orderId)
    .eq("provider", "cj")
    .in("status", ["pending", "retry"]);
  if (error) throw error;
  const results = [];
  for (const fulfillment of fulfillments ?? []) {
    try {
      await submitCjFulfillment(supabaseAdmin, fulfillment.id);
      results.push({ id: fulfillment.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar pedido à CJ.";
      await supabaseAdmin.from("supplier_fulfillments").update({
        status: "retry",
        last_error: message,
        next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      }).eq("id", fulfillment.id);
      results.push({ id: fulfillment.id, ok: false });
    }
  }
  return results;
}
