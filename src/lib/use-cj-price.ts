import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useDeliveryAddress } from "./delivery-context";
import { quoteMarketplaceShipping } from "./shipping.functions";
import { deliveryDateRange } from "./delivery-estimate";
import { createQuoteBatcher } from "./quote-batcher";

// Serialize visible-product quotes so catalog rendering never floods the supplier,
// and batch all cards that become visible in the same moment into ONE server call.
type QuoteGroups = Array<{
  storeId?: string;
  options?: Array<{
    id?: string; amount: number; serviceName: string; expiresAt?: string;
    deliveryDaysMin: number | null; deliveryDaysMax: number | null;
    embeddedFreeShipping?: boolean;
    itemPrices?: Array<{ product_id: string; unit_price: number }>;
  }>;
}>;
type PendingQuote = {
  productId: string; quantity: number; postalCode: string;
  quoteFn: (args: { data: { postalCode: string; items: Array<{ productId: string; quantity: number }> } }) => Promise<QuoteGroups>;
};
const queueQuote = createQuoteBatcher<PendingQuote, QuoteGroups>(async (batch) => {
  const groups: QuoteGroups = [];
  const byCep = new Map<string, PendingQuote[]>();
  for (const item of batch) {
    const items = byCep.get(item.postalCode) ?? [];
    items.push(item);
    byCep.set(item.postalCode, items);
  }
  for (const [postalCode, items] of byCep) {
    const first = items[0];
    if (!first) continue;
    groups.push(...await first.quoteFn({ data: { postalCode, items: items.map(({ productId, quantity }) => ({ productId, quantity })) } }));
  }
  return groups;
});

function enqueueQuote(
  quoteFn: (args: { data: { postalCode: string; items: Array<{ productId: string; quantity: number }> } }) => Promise<QuoteGroups>,
  postalCode: string, productId: string, quantity: number,
): Promise<QuoteGroups> {
  return queueQuote({ productId, quantity, postalCode, quoteFn });
}
type DeliveryPrice = { price: number; shipping: number; service: string; quoteId: string;
  storeId: string; expiresAt: string; embeddedFreeShipping: boolean; postalCode: string;
  deliveryDaysMin: number | null; deliveryDaysMax: number | null; estimatedAt: string };

export function useCjPrice(productId: string, quantity = 1, enabled = true, visibleOnly = false) {
  const quote = useServerFn(quoteMarketplaceShipping);
  const qc = useQueryClient();
  const { userId, postalCode, loading: addressLoading } = useDeliveryAddress();
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(!visibleOnly);
  const current = useRef({ visible, postalCode, productId, quantity, userId });
  current.current = { visible, postalCode, productId, quantity, userId };
  useEffect(() => {
    if (!visibleOnly || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visibleOnly]);
  const result = useQuery<DeliveryPrice>({
    queryKey: ["cj-delivery-price", userId, productId, quantity, postalCode],
    enabled: Boolean(enabled && visible && userId && postalCode),
    staleTime: (query) => {
      const expiry = query.state.data?.expiresAt;
      return expiry ? Math.max(0, Date.parse(expiry) - query.state.dataUpdatedAt - 60_000) : 0;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!postalCode || !userId) throw new Error("Endereço não informado.");
      const groups = await enqueueQuote(quote, postalCode, productId, quantity);
      if (signal.aborted || !current.current.visible || current.current.postalCode !== postalCode ||
          current.current.productId !== productId || current.current.quantity !== quantity ||
          qc.getQueryData(["delivery-user"]) !== userId) throw new Error("Consulta de entrega interrompida.");
      const group = groups.find((entry) => entry.options?.some((option) => option.itemPrices?.some((item) => item.product_id === productId)));
      const option = group?.options?.find((entry) => entry.itemPrices?.some((item) => item.product_id === productId));
      const item = option?.itemPrices?.find((entry) => entry.product_id === productId);
      if (!item || !option) throw new Error("Não foi possível confirmar a entrega para o endereço salvo.");
      if (!group?.storeId || !option.expiresAt || !option.id) throw new Error("Cotação incompleta.");
      return { price: Number(item.unit_price), shipping: Number(option.amount), service: option.serviceName,
        quoteId: option.id, storeId: group.storeId, expiresAt: option.expiresAt,
        embeddedFreeShipping: Boolean(option.embeddedFreeShipping), postalCode,
        deliveryDaysMin: option.deliveryDaysMin, deliveryDaysMax: option.deliveryDaysMax,
        estimatedAt: new Date().toISOString() };
    },
  });
  const valid = Boolean(result.data && Date.parse(result.data.expiresAt) > Date.now() + 60_000);
  useEffect(() => {
    if (!result.data?.expiresAt || !enabled || !visible) return;
    const timer = setTimeout(() => void result.refetch(), Math.max(0, Date.parse(result.data.expiresAt) - Date.now() - 60_000));
    return () => clearTimeout(timer);
  }, [result.data?.expiresAt, enabled, visible]);
  return { ref, userId, postalCode, price: valid ? result.data?.price ?? null : null,
    shipping: valid ? result.data?.shipping ?? null : null,
    quoteId: valid ? result.data?.quoteId : undefined, expiresAt: valid ? result.data?.expiresAt : undefined,
    embeddedFreeShipping: valid && result.data?.embeddedFreeShipping,
    arrivalRange: valid && result.data ? deliveryDateRange(result.data.deliveryDaysMin, result.data.deliveryDaysMax, result.data.estimatedAt) : null,
    service: result.data?.service ?? "", loading: addressLoading || result.isFetching,
    error: result.isError ? "Não foi possível confirmar a entrega para seu endereço." : "",
    retry: result.refetch };
}