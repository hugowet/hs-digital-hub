import { getCjAccessToken } from "@/lib/suppliers.server";
import { decryptSecret } from "@/lib/mercado-pago.server";

const CJ_API = "https://developers.cjdropshipping.com/api2.0/v1";
const MELHOR_ENVIO_API = "https://melhorenvio.com.br/api/v2";

type QuoteItem = { productId: string; quantity: number };
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

function parseDays(value: unknown) {
  const matches =
    String(value ?? "")
      .match(/\d+/g)
      ?.map(Number) ?? [];
  return { min: matches[0] ?? null, max: matches.at(-1) ?? matches[0] ?? null };
}

async function cjQuotes(supabaseAdmin: any, storeId: string, postalCode: string, products: any[]) {
  const token = await getCjAccessToken(supabaseAdmin, storeId);
  const response = await fetch(`${CJ_API}/logistic/freightCalculate`, {
    method: "POST",
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      startCountryCode: "CN",
      endCountryCode: "BR",
      zip: postalCode,
      products: products.map((product) => ({
        vid: product.supplier_variant_id,
        quantity: product.quantity,
      })),
    }),
  });
  const body = (await response.json()) as {
    result?: boolean;
    message?: string;
    data?: Array<Record<string, unknown>>;
  };
  if (!response.ok || body.result === false) {
    throw new Error(`A CJ não conseguiu calcular o frete: ${body.message ?? response.status}`);
  }
  const rate = Number(products[0]?.supplier_exchange_rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Cotação USD/BRL do produto CJ indisponível.");
  return (body.data ?? []).flatMap<QuoteOption>((entry) => {
    const usd =
      Number(entry["totalPostageFee"] ?? entry["logisticPrice"] ?? 0) +
      Number(entry["taxesFee"] ?? 0) +
      Number(entry["clearanceOperationFee"] ?? 0);
    const name = String(entry["logisticName"] ?? "").trim();
    if (!name || !Number.isFinite(usd) || usd < 0) return [];
    const days = parseDays(entry["logisticAging"]);
    return [
      {
        provider: "cj",
        serviceCode: name,
        serviceName: name,
        carrierName: "CJ Dropshipping",
        // TRAVA DE PREÇO: Para dropshipping da CJ, o frete já está embutido no preço de vitrine
        amount: 0,
        deliveryDaysMin: days.min ?? 12,
        deliveryDaysMax: days.max ?? 18,
        providerPayload: {
          logisticName: name,
          amountUsd: usd,
          exchangeRate: rate,
          originalFreightBrl: Math.round(usd * rate * 100) / 100,
        },
      },
    ];
  });
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
    (product) => !product.weight_kg || !product.height_cm || !product.width_cm || !product.length_cm,
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

  const body = (await response.json()) as Array<Record<string, any>> | { message?: string };
  if (!response.ok || !Array.isArray(body)) {
    throw new Error(
      `O Melhor Envio não conseguiu calcular o frete: ${Array.isArray(body) ? response.status : (body.message ?? response.status)}`,
    );
  }
  return body.flatMap<QuoteOption>((entry) => {
    const amount = Number(entry["price"] ?? entry["custom_price"]);
    if (entry["error"] || !Number.isFinite(amount) || amount < 0) return [];
    const days = Number(entry["delivery_time"] ?? entry["custom_delivery_time"]);
    return [
      {
        provider: "melhor_envio",
        serviceCode: String(entry["id"]),
        serviceName: String(entry["name"] ?? "Entrega"),
        carrierName: String(entry["company"]?.name ?? "Transportadora"),
        amount,
        deliveryDaysMin: Number.isFinite(days) ? days : null,
        deliveryDaysMax: Number.isFinite(days) ? days : null,
        providerPayload: { serviceId: entry["id"] },
      },
    ];
  });
}

export async function calculateShippingQuotes(
  supabaseAdmin: any,
  buyerId: string,
  postalCode: string,
  requestedItems: QuoteItem[],
) {
  const ids = requestedItems.map((item) => item.productId);
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id,title,price,free_shipping,store_id,product_type,supplier,supplier_variant_id,supplier_exchange_rate,weight_kg,height_cm,width_cm,length_cm,stores(id,name,origin_postal_code,status)",
    )
    .in("id", ids)
    .eq("is_active", true);
  if (error) throw error;
  if ((data?.length ?? 0) !== ids.length) throw new Error("Um produto do carrinho não está mais disponível.");

  const quantity = new Map(requestedItems.map((item) => [item.productId, item.quantity]));
  const physical = (data ?? [])
    .filter((product: any) => product.product_type !== "digital")
    .map((product: any) => ({ ...product, quantity: quantity.get(product.id) ?? 1 }));
  const stores = new Map<string, any[]>();
  for (const product of physical) stores.set(product.store_id, [...(stores.get(product.store_id) ?? []), product]);
  const result: Array<{ storeId: string; storeName: string; options: any[] }> = [];

  for (const [storeId, products] of stores) {
    const store = products[0]?.stores;
    const suppliers = new Set(products.map((product) => product.supplier ?? "own"));
    const providerType: "cj" | "melhor_envio" = suppliers.has("cj") ? "cj" : "melhor_envio";

    let rawOptions: QuoteOption[] = [];

    // Tenta cotar com o provedor oficial (CJ ou Melhor Envio)
    try {
      if (suppliers.has("cj")) {
        rawOptions = await cjQuotes(supabaseAdmin, storeId, postalCode, products);
      } else {
        rawOptions = await melhorEnvioQuotes(supabaseAdmin, store, postalCode, products);
      }
    } catch (apiErr) {
      console.warn("Cotação externa falhou ou não configurada; aplicando frete padrão do marketplace:", apiErr);
    }

    // Se a API externa não responder ou falhar, aplica opções padrão para nunca travar a compra
    if (rawOptions.length === 0) {
      const allFreeShipping = products.every((p) => p.free_shipping);
      rawOptions = [
        {
          provider: providerType,
          serviceCode: "envio-padrao",
          serviceName: allFreeShipping ? "Frete Grátis Promocional" : "Envio Padrão Econômico",
          carrierName: "Correios / Transportadora",
          amount: allFreeShipping ? 0 : 19.9,
          deliveryDaysMin: 5,
          deliveryDaysMax: 12,
          providerPayload: { fallback: true },
        },
        {
          provider: providerType,
          serviceCode: "envio-expresso",
          serviceName: "Envio Expresso Prioritário",
          carrierName: "Sedex / Expresso",
          amount: allFreeShipping ? 14.9 : 34.9,
          deliveryDaysMin: 2,
          deliveryDaysMax: 5,
          providerPayload: { fallback: true },
        },
      ];
    }

    const canonicalItems = products
      .map((product) => ({ product_id: product.id, quantity: product.quantity }))
      .sort((a, b) => a.product_id.localeCompare(b.product_id));
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
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

    const { data: saved, error: saveError } = await supabaseAdmin.from("shipping_quotes").insert(rows).select();
    if (saveError) throw saveError;

    result.push({
      storeId,
      storeName: store.name,
      options: (saved ?? []).map((quote: any) => ({
        id: quote.id,
        provider: quote.provider,
        serviceName: quote.service_name,
        carrierName: quote.carrier_name,
        amount: Number(quote.amount),
        deliveryDaysMin: quote.delivery_days_min,
        deliveryDaysMax: quote.delivery_days_max,
        expiresAt: quote.expires_at,
      })),
    });
  }

  return result;
}
