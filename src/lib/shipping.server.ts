import { cjRequest, getCjAccessToken, getUsdBrlRate } from "@/lib/suppliers.server";
import { decryptSecret } from "@/lib/mercado-pago.server";

import { priceCjShipment, cjFreightUsd } from "@/lib/cj-landed-pricing";
import { cjShippingModalities, includeFirstPurchaseMargin } from "@/lib/shipping-modalities";
import { cjVariantStock } from "@/lib/cj-variants";

const MELHOR_ENVIO_API = "https://melhorenvio.com.br/api/v2";

type QuoteOption = {
  provider: "cj" | "melhor_envio";
  serviceCode: string;
  serviceName: string;
  carrierName: string;
  amount: number;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  providerPayload: Record<string, unknown>;
};

async function cjQuotes(supabaseAdmin: any, storeId: string, postalCode: string, products: any[]): Promise<QuoteOption[]> {
  const token = await getCjAccessToken(supabaseAdmin, storeId);
  const exchange = await getUsdBrlRate(supabaseAdmin, storeId);
  const { data: platform, error: platformError } = await supabaseAdmin.from("platform_settings").select("commission_rate").eq("id", true).single();
  if (platformError || !platform) throw new Error("Não foi possível confirmar a comissão. Compra CJ bloqueada.");
  const currentItems: Array<{ productId: string; quantity: number; costUsd: number }> = [];
  for (const product of products) {
    if (!product.supplier_variant_id) throw new Error("Produto sem variante CJ confirmada.");
    const variant = await cjRequest<any>(`/product/variant/queryByVid?vid=${encodeURIComponent(product.supplier_variant_id)}`, token);
    const cost = Number(variant?.variantSellPrice);
    if (variant?.vid !== product.supplier_variant_id || !Number.isFinite(cost) || cost <= 0) {
      throw new Error("Não foi possível confirmar o custo atual do produto na CJ.");
    }
    const stockData = await cjRequest<unknown>(`/product/stock/queryByVid?vid=${encodeURIComponent(product.supplier_variant_id)}`, token);
    const stock = cjVariantStock(stockData);
    if (stock < product.quantity) throw new Error(`A opção de “${product.title}” está sem estoque na CJ.`);
    const { error } = await supabaseAdmin.from("products").update({
      stock,
      supplier_cost: cost, supplier_exchange_rate: exchange.rate,
      supplier_exchange_rate_at: exchange.quotedAt, supplier_last_synced_at: new Date().toISOString(),
    }).eq("id", product.id);
    if (error) throw error;
    currentItems.push({ productId: product.id, quantity: product.quantity, costUsd: cost });
  }
  const response = await cjRequest<Array<Record<string, unknown>>>("/logistic/freightCalculate", token, {
    method: "POST", signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({ startCountryCode: "CN", endCountryCode: "BR", zip: postalCode,
      products: products.map((product) => ({ vid: product.supplier_variant_id, quantity: product.quantity })) }),
  });
  if (!Array.isArray(response)) throw new Error("A CJ não retornou opções de envio para este CEP.");
  return cjShippingModalities(response.flatMap<QuoteOption>((entry) => {
    const name = typeof entry.logisticName === "string" ? entry.logisticName.trim() : "";
    if (!name) return [];
    const priced = priceCjShipment(currentItems, cjFreightUsd(entry), exchange.rate, Number(platform.commission_rate));
    const days = String(entry.logisticAging ?? "").match(/\d+/g)?.map(Number) ?? [];
    return [{ provider: "cj", serviceCode: name, serviceName: name, carrierName: name,
      amount: priced.amount, deliveryDaysMin: days[0] ?? null,
      deliveryDaysMax: days[1] ?? days[0] ?? null,
      providerPayload: { pricing_version: 1, profit_guard_version: 1, commission_rate: Number(platform.commission_rate), cj: entry, exchangeRate: exchange.rate,
        protected_net_target: priced.items.reduce((sum, item) => sum + item.protected_net_target * item.quantity, 0),
        supplier_freight_brl: priced.freightBrl, embedded_free_shipping: priced.embedded,
        priced_items: priced.items, quoted_at: new Date().toISOString() } }];
  }));
}

async function melhorEnvioQuotes(supabaseAdmin: any, store: any, postalCode: string, products: any[]) {
  if (!store.origin_postal_code) throw new Error(`A loja ${store.name} ainda não informou o CEP de origem.`);
  const { data: integration } = await supabaseAdmin
    .from("seller_shipping_integrations")
    .select("access_token_encrypted,status")
    .eq("store_id", store.id)
    .eq("provider", "melhor_envio")
    .maybeSingle();
  if (!integration?.access_token_encrypted || integration.status !== "active") {
    throw new Error(`A loja ${store.name} ainda não conectou o Melhor Envio.`);
  }
  const incomplete = products.find(
    (product) => !product.weight_kg || !product.height_cm || !product.width_cm || !product.length_cm
  );
  if (incomplete) throw new Error(`O produto “${incomplete.title}” ainda não possui peso e dimensões para o frete.`);
  const response = await fetch(`${MELHOR_ENVIO_API}/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await decryptSecret(integration.access_token_encrypted)}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": process.env["MELHOR_ENVIO_USER_AGENT"] ?? "HS Digital Marketplace",
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      from: { postal_code: store.origin_postal_code },
      to: { postal_code: postalCode },
      products: products.map((product) => ({
        id: product.id,
        width: Number(product.width_cm),
        height: Number(product.height_cm),
        length: Number(product.length_cm),
        weight: Number(product.weight_kg),
        insurance_value: Number(product.price),
        quantity: product.quantity,
      })),
    }),
  });
  const body = (await response.json()) as Array<Record<string, unknown>>;
  if (!response.ok || !Array.isArray(body)) {
    throw new Error("O Melhor Envio não retornou opções válidas.");
  }
  return body.flatMap<QuoteOption>((entry) => {
    if (entry["error"]) return [];
    const code = String(entry["id"] ?? "");
    const name = String(entry["name"] ?? "");
    const company = (entry["company"] as { name?: string })?.name ?? "Transportadora";
    const customPrice = Number(entry["custom_price"] ?? entry["price"] ?? 0);
    const delivery = entry["delivery_range"] as { min?: number; max?: number } | undefined;
    if (!code || !name || !Number.isFinite(customPrice) || customPrice <= 0) return [];
    return [
      {
        provider: "melhor_envio",
        serviceCode: code,
        serviceName: name,
        carrierName: company,
        amount: Math.round(customPrice * 100) / 100,
        deliveryDaysMin: delivery?.min ?? null,
        deliveryDaysMax: delivery?.max ?? null,
        providerPayload: entry,
      },
    ];
  });
}

export async function quoteCartShipping(
  supabaseAdmin: any,
  buyerId: string | null | undefined,
  postalCode: string,
  items: Array<{ productId: string; quantity: number }>
) {
  const ids = items.map((item) => item.productId);
  const { data: dbProducts, error } = await supabaseAdmin
    .from("products")
    .select(
      "id,title,price,free_shipping,weight_kg,height_cm,width_cm,length_cm,store_id,supplier,supplier_product_id,supplier_variant_id,supplier_exchange_rate,supplier_cost,product_type,is_active,stock,stores(id,name,status,origin_postal_code)"
    )
    .in("id", ids);
  if (error) throw error;

  const stores = new Map<string, any[]>();
  for (const item of items) {
    const product = dbProducts?.find((p: any) => p.id === item.productId);
    if (!product || !product.is_active || product.stores?.status !== "approved") throw new Error("Produto indisponível.");
    if (product.product_type === "digital") continue;
    if (product.supplier !== "cj" && Number(product.stock) < item.quantity) throw new Error("Quantidade indisponível.");
    const storeProducts = stores.get(product.store_id) ?? [];
    storeProducts.push({ ...product, quantity: item.quantity });
    stores.set(product.store_id, storeProducts);
  }

  const result: any[] = [];
  let firstPurchase = false;
  if (buyerId) {
    const { count, error: historyError } = await supabaseAdmin.from("orders")
      .select("id", { count: "exact", head: true }).eq("buyer_id", buyerId)
      .not("status", "in", '("cancelled","payment_failed")');
    if (historyError) throw historyError;
    firstPurchase = count === 0;
  }
  let marginAllocated = false;

  for (const [storeId, products] of stores) {
    const store = products[0]?.stores;
    const canonicalItems = products.map((product) => ({ product_id: product.id, quantity: product.quantity }))
      .sort((a, b) => a.product_id.localeCompare(b.product_id));
    const suppliers = new Set(products.map((product) => product.supplier ?? "own"));
    if (suppliers.has("cj") && suppliers.size > 1) {
      throw new Error("Finalize produtos CJ e produtos de estoque próprio em pedidos separados.");
    }
    // Reuse the product's buyer-bound quote in the cart: same destination, items and price.
    if (buyerId && suppliers.has("cj")) {
      const { data: cached, error: cacheError } = await supabaseAdmin.from("shipping_quotes").select("*")
        .eq("buyer_id", buyerId).eq("store_id", storeId).eq("destination_postal_code", postalCode)
        .eq("provider", "cj").eq("items", JSON.stringify(canonicalItems)).is("consumed_order_id", null)
        .gt("expires_at", new Date(Date.now() + 60_000).toISOString())
        .order("created_at", { ascending: false }).limit(10);
      if (cacheError) throw cacheError;
      const current = (cached ?? []).filter((row: any) => row.provider_payload?.modality && row.provider_payload.profit_guard_version === 1
        && Boolean(row.provider_payload.first_purchase_margin_included) === (firstPurchase && !marginAllocated && Boolean(row.provider_payload.embedded_free_shipping)));
      const express = current.find((row: any) => row.provider_payload.modality === "express");
      const premium = current.find((row: any) => row.provider_payload.modality === "premium" && row.expires_at === express?.expires_at);
      if (express) {
        const rows = premium ? [express, premium] : [express];
        marginAllocated ||= Boolean(express.provider_payload.first_purchase_margin_included);
        result.push({ storeId, storeName: store?.name ?? "HS Digital", options: rows.map((row: any) => ({
          id: row.id, provider: row.provider, serviceName: row.service_name, carrierName: row.carrier_name,
          amount: Number(row.amount), itemPrices: row.provider_payload.priced_items,
          supplierFreight: Number(row.provider_payload.supplier_freight_brl),
          embeddedFreeShipping: Boolean(row.provider_payload.embedded_free_shipping),
          deliveryDaysMin: row.delivery_days_min, deliveryDaysMax: row.delivery_days_max, expiresAt: row.expires_at,
        })) });
        continue;
      }
    }
    let rawOptions = suppliers.has("cj")
      ? await cjQuotes(supabaseAdmin, storeId, postalCode, products)
      : await melhorEnvioQuotes(supabaseAdmin, store, postalCode, products);
    if (!rawOptions.length) throw new Error("Nenhum envio foi confirmado para este CEP. Não será cobrado frete estimado.");
    if (suppliers.has("cj")) {
      rawOptions = includeFirstPurchaseMargin(rawOptions, firstPurchase && !marginAllocated);
      marginAllocated ||= Boolean(rawOptions[0]?.providerPayload.first_purchase_margin_included);
    }

    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

    // Se o comprador ainda não estiver autenticado, retorna as opções calculadas sem gravar no banco
    if (!buyerId) {
      result.push({
        storeId,
        storeName: store?.name ?? "HS Digital",
        options: rawOptions.map((option, idx) => ({
          id: `preview_${storeId}_${idx}`,
          provider: option.provider,
          serviceName: option.serviceName,
          carrierName: option.carrierName,
          amount: Number(option.amount),
          itemPrices: (option.providerPayload.priced_items ?? []) as Array<{ product_id: string; unit_price: number; quantity: number }>,
          supplierFreight: Number(option.providerPayload.supplier_freight_brl ?? option.amount),
          embeddedFreeShipping: Boolean(option.providerPayload.embedded_free_shipping),
          deliveryDaysMin: option.deliveryDaysMin,
          deliveryDaysMax: option.deliveryDaysMax,
          expiresAt,
        })),
      });
      continue;
    }

    const rows = rawOptions.map((option) => ({
      buyer_id: buyerId,
      store_id: storeId,
      provider: option.provider,
      service_code: option.serviceCode,
      service_name: option.serviceName,
      carrier_name: option.carrierName,
      amount: option.amount,
      delivery_days_min: option.deliveryDaysMin,
      delivery_days_max: option.deliveryDaysMax,
      destination_postal_code: postalCode,
      items: canonicalItems,
      provider_payload: option.providerPayload,
      expires_at: expiresAt,
    }));

    const { data: saved, error: saveError } = await supabaseAdmin
      .from("shipping_quotes")
      .insert(rows)
      .select();
    if (saveError) throw saveError;

    result.push({
      storeId,
      storeName: store?.name ?? "HS Digital",
      options: (saved ?? []).sort((a: any, b: any) =>
        Number(a.provider_payload?.modality === "premium") - Number(b.provider_payload?.modality === "premium")
      ).map((quote: any) => ({
        id: quote.id,
        provider: quote.provider,
        serviceName: quote.service_name,
        carrierName: quote.carrier_name,
        amount: Number(quote.amount),
        itemPrices: (quote.provider_payload?.priced_items ?? []) as Array<{ product_id: string; unit_price: number; quantity: number }>,
        supplierFreight: Number(quote.provider_payload?.supplier_freight_brl ?? quote.amount),
        embeddedFreeShipping: Boolean(quote.provider_payload?.embedded_free_shipping),
        deliveryDaysMin: quote.delivery_days_min,
        deliveryDaysMax: quote.delivery_days_max,
        expiresAt: quote.expires_at,
      })),
    });
  }

  return result;
}

export const calculateShippingQuotes = quoteCartShipping;
