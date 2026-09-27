import { useEffect, useId, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => {
        create: (type: string, id: string, settings: Record<string, unknown>) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

type CardData = {
  token: string;
  payment_method_id: string;
  issuer_id?: string;
  installments: number;
  payer: { email: string; identification?: { type?: string; number?: string } };
};

export function MercadoPagoCard({
  publicKey,
  amount,
  onSubmit,
}: {
  publicKey: string;
  amount: number;
  onSubmit: (data: CardData) => Promise<void>;
}) {
  const rawId = useId();
  const containerId = `mp-card-${rawId.replace(/:/g, "")}`;
  const mounted = useRef(false);

  useEffect(() => {
    if (!publicKey || mounted.current) return;
    let controller: { unmount: () => void } | undefined;
    let cancelled = false;
    const mount = async () => {
      if (!window.MercadoPago) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.mercadopago.com/js/v2"]');
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("Falha ao carregar o pagamento.")), { once: true });
            return;
          }
          const script = document.createElement("script");
          script.src = "https://sdk.mercadopago.com/js/v2";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Falha ao carregar o pagamento."));
          document.head.appendChild(script);
        });
      }
      if (cancelled || !window.MercadoPago) return;
      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      controller = await mp.bricks().create("cardPayment", containerId, {
        initialization: { amount },
        customization: { paymentMethods: { maxInstallments: 12 } },
        callbacks: {
          onReady: () => { mounted.current = true; },
          onSubmit: async (formData: CardData) => onSubmit(formData),
          onError: () => toast.error("Não foi possível carregar o cartão."),
        },
      });
    };
    void mount().catch((error) => toast.error(error instanceof Error ? error.message : "Falha no pagamento."));
    return () => {
      cancelled = true;
      controller?.unmount();
      mounted.current = false;
    };
  }, [amount, containerId, onSubmit, publicKey]);

  if (!publicKey) return <Button disabled className="w-full">Cartão indisponível</Button>;
  return <div id={containerId} className="min-h-80" />;
}