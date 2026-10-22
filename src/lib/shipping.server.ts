import { getCjAccessToken } from "@/lib/suppliers.server";
import { decryptSecret } from "@/lib/mercado-pago.server";

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

// Faixas de desconto conforme especificado: 5, 6, 7, 12, 22, 35, 50, 66, 71%
const DISCOUNT_TIERS = [5, 6, 7, 12, 22, 35, 50, 66, 71] as const;

function getProductDiscountPercent(productId: string): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash << 5) - hash + productId.charCodeAt(i);
    hash |= 0;
  }
  return DISCOUNT_TIERS[Math.abs(hash) % DISCOUNT_TIERS.length];
}

async function cjQuotes(postalCode: string, products: any[]): Promise<QuoteOption[]> {
  const rate = Number(products[0]?.supplier_exchange_rate) || 5.2238;

  // Separa produtos abaixo de 87,90
  const belowThresholdProducts = products.filter((p) => Number(p.price || 0) <= 87.90);
  const allAboveThreshold = belowThresholdProducts.length === 0;

  let expressAmount = 0;
  let premiumAmount = 15.0;

  if (allAboveThreshold) {
    expressAmount = 0;
    premiumAmount = 15.0;
  } else {
    const maxDiscount = Math.max(...belowThresholdProducts.map((p) => getProductDiscountPercent(p.id)));
    expressAmount = Math.round(19.90 * (1 - maxDiscount / 100) * 100) / 100;
    premiumAmount = Math.round((expressAmount + 15.0) * 100) / 100;
  }

  return [
    {
      provider: "cj",
      serviceCode: "yunexpress-sensitive",
      serviceName: "⚡ Envio Prioritário Express",
      carrierName: "YunExpress Sensitive",
      amount: expressAmount,
      deliveryDaysMin: 12,
      deliveryDaysMax: 18,
      providerPayload: {
        method: "yunexpress_sensitive",
        baseFreightUsd: 15.19,
        exchangeRate: rate,
        isFree: expressAmount === 0,
      },
    },
    {
      provider: "cj",
      serviceCode: "cjpacket-sensitive",
      serviceName: "🚀 Envio Prioritário Premium",
      carrierName: "CJPacket Sensitive",
      amount: premiumAmount,
      deliveryDaysMin: 8,
      deliveryDaysMax: 14,
      providerPayload: {
        method: "cjpacket_sensitive",
        surchargeBrl: 15.0,
        exchangeRate: rate,
      },
    },
  ];
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
      "id,title,price,free_shipping,weight_kg,height_cm,width_cm,length_cm,store_id,supplier,supplier_product_id,supplier_variant_id,supplier_exchange_rate,supplier_cost,stores(id,name,origin_postal_code)"
    )
    .in("id", ids);
  if (error) throw error;

  const stores = new Map<string, any[]>();
  for (const item of items) {
    const product = dbProducts?.find((p: any) => p.id === item.productId);
    if (!product) continue;
    const storeProducts = stores.get(product.store_id) ?? [];
    storeProducts.push({ ...product, quantity: item.quantity });
    stores.set(product.store_id, storeProducts);
  }

  const result: any[] = [];

  for (const [storeId, products] of stores) {
    const store = products[0]?.stores;
    const suppliers = new Set(products.map((product) => product.supplier ?? "own"));
    const providerType: "cj" | "melhor_envio" = suppliers.has("cj") ? "cj" : "melhor_envio";

    let rawOptions: QuoteOption[] = [];

    try {
      if (suppliers.has("cj")) {
        rawOptions = await cjQuotes(postalCode, products);
      } else {
        rawOptions = await melhorEnvioQuotes(supabaseAdmin, store, postalCode, products);
      }
    } catch (apiErr) {
      console.warn("Cotação externa; aplicando opções de contingência calculadas:", apiErr);
    }

    if (rawOptions.length === 0) {
      const belowThreshold = products.filter((p) => Number(p.price || 0) <= 87.90);
      let fallbackExpress = 0;
      if (belowThreshold.length > 0) {
        const maxDiscount = Math.max(...belowThreshold.map((p) => getProductDiscountPercent(p.id)));
        fallbackExpress = Math.round(19.90 * (1 - maxDiscount / 100) * 100) / 100;
      }
      rawOptions = [
        {
          provider: providerType,
          serviceCode: "yunexpress-sensitive",
          serviceName: "⚡ Envio Prioritário Express",
          carrierName: "YunExpress Sensitive",
          amount: fallbackExpress,
          deliveryDaysMin: 12,
          deliveryDaysMax: 18,
          providerPayload: { fallback: true },
        },
        {
          provider: providerType,
          serviceCode: "cjpacket-sensitive",
          serviceName: "🚀 Envio Prioritário Premium",
          carrierName: "CJPacket Sensitive",
          amount: Math.round((fallbackExpress + 15.0) * 100) / 100,
          deliveryDaysMin: 8,
          deliveryDaysMax: 14,
          providerPayload: { fallback: true },
        },
      ];
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
          deliveryDaysMin: option.deliveryDaysMin,
          deliveryDaysMax: option.deliveryDaysMax,
          expiresAt,
        })),
      });
      continue;
    }

    const canonicalItems = products
      .map((product) => ({ product_id: product.id, quantity: product.quantity }))
      .sort((a, b) => a.product_id.localeCompare(b.product_id));

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

export const calculateShippingQuotes = quoteCartShipping;
