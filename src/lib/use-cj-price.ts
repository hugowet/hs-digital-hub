import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { savedDeliveryPostalCode } from "./delivery-address";
import { quoteMarketplaceShipping } from "./shipping.functions";

// Serialize visible-product quotes so catalog rendering never floods the supplier.
let quoteQueue: Promise<unknown> = Promise.resolve();

export function useCjPrice(productId: string, quantity = 1, enabled = true, visibleOnly = false) {
  const quote = useServerFn(quoteMarketplaceShipping);
  const qc = useQueryClient();
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(!visibleOnly);
  const { data: userId } = useQuery({
    queryKey: ["delivery-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 60_000,
  });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      qc.setQueryData(["delivery-user"], session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  useEffect(() => {
    if (!visibleOnly || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), { rootMargin: "100px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visibleOnly]);
  const { data: addresses = [] } = useQuery({
    queryKey: ["my-addresses", userId],
    enabled: Boolean(userId && enabled),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("user_addresses").select("*").eq("user_id", userId)
        .order("is_default", { ascending: false }).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const postalCode = userId ? savedDeliveryPostalCode(addresses) : "";
  const result = useQuery({
    queryKey: ["cj-delivery-price", userId, productId, quantity, postalCode],
    enabled: Boolean(enabled && visible && userId && postalCode),
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: () => {
      const task = quoteQueue.catch(() => undefined).then(async () => {
        if (qc.getQueryData(["delivery-user"]) !== userId) throw new Error("Entre na sua conta para consultar a entrega.");
        const groups = await quote({ data: { postalCode, items: [{ productId, quantity }] } });
        const option = groups[0]?.options[0];
        const item = option?.itemPrices?.find((entry: { product_id: string }) => entry.product_id === productId);
        if (!item || !option) throw new Error("Não foi possível confirmar a entrega para o endereço salvo.");
        return { price: Number(item.unit_price), shipping: Number(option.amount), service: option.serviceName };
      });
      quoteQueue = task;
      return task;
    },
  });
  const rawError = result.error instanceof Error ? result.error.message : "";
  // Frete não confirmado para o CEP não é erro visível: o preço do produto já vale.
  const error = rawError.includes("Nenhum envio foi confirmado") ? "" : rawError;
  return { ref, postalCode, price: result.data?.price ?? null, shipping: result.data?.shipping ?? null,
    service: result.data?.service ?? "", loading: result.isFetching, error };
}