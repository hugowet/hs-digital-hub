import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { quoteMarketplaceShipping } from "./shipping.functions";

export function useCjPrice(productId: string, quantity = 1) {
  const quote = useServerFn(quoteMarketplaceShipping);
  const [postalCode, setPostalCode] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [shipping, setShipping] = useState<number | null>(null);
  const [service, setService] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setPostalCode(localStorage.getItem("hs-delivery-cep") ?? "");
  }, []);
  useEffect(() => { setPrice(null); setShipping(null); setService(""); }, [postalCode, quantity, productId]);
  async function calculate() {
    if (postalCode.replace(/\D/g, "").length !== 8) { setError("Informe um CEP com 8 dígitos."); return; }
    setLoading(true); setError(""); setPrice(null);
    try {
      const groups = await quote({ data: { postalCode, items: [{ productId, quantity }] } });
      const option = groups[0]?.options[0];
      const item = option?.itemPrices?.find((entry: { product_id: string }) => entry.product_id === productId);
      if (!item) throw new Error("Preço CJ não confirmado para este CEP.");
      setPrice(Number(item.unit_price)); setShipping(Number(option.amount)); setService(option.serviceName);
      localStorage.setItem("hs-delivery-cep", postalCode.replace(/\D/g, ""));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível consultar a CJ.");
    } finally { setLoading(false); }
  }
  return { postalCode, setPostalCode, price, shipping, service, loading, error, calculate };
}