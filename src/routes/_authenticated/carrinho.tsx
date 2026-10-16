import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  CreditCard,
  Gamepad2,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Store,
  TicketPercent,
  Trash2,
  Truck,
  Zap,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { groupByStore, useCart } from "@/lib/cart";
import { trackCheckoutAbandonment } from "@/lib/abandoned-cart";
import { brl } from "@/lib/format";
import { createMarketplaceCheckout } from "@/lib/payments.functions";
import { quoteMarketplaceShipping } from "@/lib/shipping.functions";
import { getMyCoupons } from "@/lib/games.functions";
import { getFirstPurchaseShippingEligibility } from "@/lib/checkout.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho · HS Digital" },
      {
        name: "description",
        content: "Revise seus itens e conclua seu pedido com garantia e frete protegido na HS Digital.",
      },
      { property: "og:title", content: "Carrinho · HS Digital" },
      {
        property: "og:description",
        content: "Carrinho oficial da HS Digital com pagamento protegido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function getDeliveryEstimate(startDate: Date = new Date(), minDays: number = 12, maxDays: number = 18) {
  function addBusinessDays(date: Date, days: number): Date {
    const cur = new Date(date);
    let added = 0;
    while (added < days) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }
    return cur;
  }

  const minDate = addBusinessDays(startDate, minDays);
  const maxDate = addBusinessDays(startDate, maxDays);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const minDay = minDate.getDate();
  const maxDay = maxDate.getDate();
  const minMonth = months[minDate.getMonth()];
  const maxMonth = months[maxDate.getMonth()];

  const text =
    minMonth === maxMonth
      ? `Chegará entre os dias ${minDay} e ${maxDay} de ${minMonth}.`
      : `Chegará entre os dias ${minDay} de ${minMonth} e ${maxDay} de ${maxMonth}.`;

  return { minDay, maxDay, text };
}

const WARRANTY_OPTIONS = [
  { id: "1_year", title: "1 ano", amount: 5.0, originalAmount: 5.0, tag: null },
  { id: "1_5_years", title: "1 ano e meio", amount: 6.0, originalAmount: 6.0, tag: null },
  {
    id: "2_years",
    title: "2 anos (Recomendado)",
    amount: 7.0,
    originalAmount: 8.75,
    tag: "Economize R$ 1,75",
  },
] as const;

function CartPage() {
  const { items, setQuantity, remove, subtotal } = useCart();
  const navigate = useNavigate();
  const createCheckout = useServerFn(createMarketplaceCheckout);
  const quoteShipping = useServerFn(quoteMarketplaceShipping);
  const loadCoupons = useServerFn(getMyCoupons);
  const loadFirstPurchaseEligibility = useServerFn(getFirstPurchaseShippingEligibility);
  const groups = groupByStore(items);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [quotes, setQuotes] = useState<
    Array<{
      storeId: string;
      storeName: string;
      options: Array<{
        id: string;
        serviceName: string;
        carrierName: string;
        amount: number;
        deliveryDaysMin: number | null;
        deliveryDaysMax: number | null;
      }>;
    }>
  >([]);
  const [selectedQuotes, setSelectedQuotes] = useState<Record<string, string>>({});
  const [coupons, setCoupons] = useState<Awaited<ReturnType<typeof getMyCoupons>>>([]);
  const [firstPurchaseEligible, setFirstPurchaseEligible] = useState(false);

  // Integração com Jogos: Cupom opcional
  const [applyGameCoupon, setApplyGameCoupon] = useState(false);
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>(null);

  const FRETE_REFERENCIA_PLATAFORMA = 20.0;

  // Previsões de entrega dinâmicas pulando fins de semana
  const expressEstimate = useMemo(() => getDeliveryEstimate(new Date(), 12, 18), []);
  const premiumEstimate = useMemo(() => getDeliveryEstimate(new Date(), 8, 14), []);

  // Melhor cupom ganho nos jogos (ex: 5% a 20%)
  const bestGameCoupon = useMemo(() => {
    return coupons.find(
      (c) => c.status === "active" && Number(c.percent_off) > 0 && new Date(c.expires_at).getTime() > Date.now()
    );
  }, [coupons]);

  const gameCouponDiscountPercent = applyGameCoupon && bestGameCoupon ? Number(bestGameCoupon.percent_off) : 0;

  // Lógica de Desconto de Frete (Primeira Compra x Segunda em Diante)
  let taxaFreteBase = 0;
  let descontoPercentualFrete = 0;

  if (firstPurchaseEligible) {
    descontoPercentualFrete = 100;
    taxaFreteBase = 0;
  } else {
    // 50% base da 2ª compra em diante + % do cupom conquistado nos jogos
    descontoPercentualFrete = Math.min(100, 50 + gameCouponDiscountPercent);
    taxaFreteBase = Math.round(FRETE_REFERENCIA_PLATAFORMA * (1 - descontoPercentualFrete / 100) * 100) / 100;
  }

  // Verifica se o usuário escolheu o Envio Prioritário Premium (+ R$ 15,00)
  const isPremiumShippingSelected = useMemo(() => {
    return Object.values(selectedQuotes).some((quoteId) => {
      const match = quotes.flatMap((g) => g.options).find((o) => o.id === quoteId);
      return match?.serviceName?.includes("Premium");
    });
  }, [selectedQuotes, quotes]);

  const adicionalFrete = isPremiumShippingSelected ? 15.0 : 0;
  const valorFreteCobrado = taxaFreteBase + adicionalFrete;

  // Garantia Premium
  const selectedWarranty = WARRANTY_OPTIONS.find((w) => w.id === selectedWarrantyId) ?? null;
  const valorSeguro = selectedWarranty ? selectedWarranty.amount : 0;

  // Total travado
  const subtotalProdutos = subtotal;
  const totalPedido = subtotalProdutos + valorFreteCobrado + valorSeguro;

  useEffect(() => {
    if (items.length > 0) void trackCheckoutAbandonment(items);
  }, [items]);

  useEffect(() => {
    supabase
      .from("user_addresses")
      .select("recipient_name,phone,street_address,city,state,postal_code,complement")
      .eq("is_default", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setName(data.recipient_name ?? "");
        setPhone(data.phone ?? "");
        setAddress(`${data.street_address ?? ""}${data.complement ? `, ${data.complement}` : ""}`);
        setCity(data.city ?? "");
        setState(data.state ?? "");
        setPostalCode(data.postal_code ?? "");
      });
  }, []);

  useEffect(() => {
    loadCoupons()
      .then((items) =>
        setCoupons(
          items.filter((coupon) => coupon.status === "active" && new Date(coupon.expires_at).getTime() > Date.now())
        )
      )
      .catch(() => undefined);
  }, [loadCoupons]);

  useEffect(() => {
    loadFirstPurchaseEligibility()
      .then(({ eligible }) => setFirstPurchaseEligible(eligible))
      .catch(() => setFirstPurchaseEligible(false));
  }, [loadFirstPurchaseEligibility]);

  const cartSignature = items
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join("|");

  const calculateShipping = async (targetZip?: string): Promise<Record<string, string> | null> => {
    const normalized = (targetZip ?? postalCode).replace(/\D/g, "");
    if (normalized.length !== 8) {
      if (!targetZip) toast.error("Informe um CEP válido com 8 números.");
      return null;
    }
    setQuoting(true);
    try {
      const validItems = items
        .map((item: any) => ({
          productId: item.productId ?? item.product_id ?? item.id,
          quantity: Number(item.quantity) || 1,
        }))
        .filter((item) => typeof item.productId === "string" && item.productId.length > 0);

      const result = await quoteShipping({
        data: {
          postalCode: normalized,
          items: validItems,
        },
      });

      setQuotes(result);
      const chosen = Object.fromEntries(
        result.map((group) => {
          // Marca por padrão a primeira opção (⚡ Envio Prioritário Express)
          const defaultOpt = group.options[0];
          return [group.storeId, defaultOpt?.id ?? ""];
        })
      );
      setSelectedQuotes(chosen);
      return chosen;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível calcular o frete.");
      return null;
    } finally {
      setQuoting(false);
    }
  };

  useEffect(() => {
    const normalized = postalCode.replace(/\D/g, "");
    if (normalized.length === 8 && items.length > 0) {
      void calculateShipping(normalized);
    }
  }, [postalCode, cartSignature]);

  const checkout = async () => {
    const physicalStoreIds = groups
      .filter((group) => group.items.some((item) => item.productType !== "digital"))
      .map((group) => group.storeId);

    const cleanZip = postalCode.replace(/\D/g, "");
    if (!name.trim() || !address.trim() || !city.trim() || state.trim().length !== 2 || cleanZip.length !== 8) {
      toast.error("Preencha nome, endereço, cidade, UF e CEP para entrega.");
      return;
    }

    let quotesToUse = { ...selectedQuotes };

    if (physicalStoreIds.some((storeId) => !quotesToUse[storeId])) {
      const freshQuotes = await calculateShipping(cleanZip);
      if (freshQuotes) {
        quotesToUse = freshQuotes;
      } else {
        toast.error("Aguarde o cálculo do frete para prosseguir.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await createCheckout({
        data: {
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          shippingAddress: {
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state.trim().toUpperCase(),
            postalCode: cleanZip,
            note: note.trim(),
          },
          shippingQuoteIds: quotesToUse,
          couponId: applyGameCoupon && bestGameCoupon ? bestGameCoupon.id : undefined,
          warranty: selectedWarranty
            ? {
                id: selectedWarranty.id,
                title: selectedWarranty.title,
                amount: selectedWarranty.amount,
              }
            : undefined,
        },
      });

      navigate({ to: "/pedido/$orderId", params: { orderId: res.orderId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao iniciar pagamento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Carrinho de Compras</h1>

        {items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <Button asChild className="mt-4">
              <Link to="/">Continuar Comprando</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Lista de Itens por Loja */}
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.storeId} className="rounded-xl border border-border bg-card p-4 shadow-2xs">
                  <header className="flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold">
                    <Store className="h-4 w-4 text-primary" />
                    <span>{group.storeName}</span>
                  </header>

                  <div className="divide-y divide-border">
                    {group.items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-4 py-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-16 w-16 rounded-md object-contain p-1 border"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                            <Store className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium leading-snug line-clamp-2">{item.title}</h4>
                          <p className="text-sm font-bold text-foreground mt-1">{brl(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs font-semibold w-5 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Painel Lateral: Endereço, Frete, Garantia e Resumo */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold">Endereço de Entrega</h3>
                <div>
                  <Label htmlFor="postalCode" className="text-xs">
                    CEP *
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => calculateShipping()}
                      disabled={quoting}
                    >
                      {quoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Calcular"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Nome completo *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Telefone (com DDD)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Endereço e número *"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="text-xs"
                  />
                  <div className="grid grid-cols-[1fr_64px] gap-2">
                    <Input
                      placeholder="Cidade *"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="text-xs"
                    />
                    <Input
                      placeholder="UF *"
                      value={state}
                      maxLength={2}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* SELEÇÃO DAS 2 OPÇÕES DE LOGÍSTICA EXCLUSIVAS */}
              {quotes.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold">Modalidade de Envio</h3>
                  </div>

                  {quotes.map((group) => {
                    const currentSelectedId = selectedQuotes[group.storeId] || group.options[0]?.id;
                    const expressOption = group.options[0];
                    const premiumOption = group.options[1];

                    return (
                      <div key={group.storeId} className="space-y-2">
                        {/* Opção 1: Envio Prioritário Express */}
                        {expressOption && (
                          <label
                            className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition ${
                              currentSelectedId === expressOption.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="radio"
                                name={`shipping-${group.storeId}`}
                                checked={currentSelectedId === expressOption.id}
                                onChange={() =>
                                  setSelectedQuotes((prev) => ({ ...prev, [group.storeId]: expressOption.id }))
                                }
                                className="mt-0.5"
                              />
                              <div>
                                <strong className="block text-foreground font-semibold">
                                  ⚡ Envio Prioritário Express
                                </strong>
                                <span className="text-[11px] text-muted-foreground block mt-0.5">
                                  YunExpress Sensitive · {expressEstimate.text}
                                </span>
                              </div>
                            </div>
                            <strong className="text-xs font-bold uppercase tracking-wide text-success">
                              {firstPurchaseEligible ? "Grátis" : "Envio Incluso"}
                            </strong>
                          </label>
                        )}

                        {/* Opção 2: Envio Prioritário Premium */}
                        {premiumOption && (
                          <label
                            className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition ${
                              currentSelectedId === premiumOption.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="radio"
                                name={`shipping-${group.storeId}`}
                                checked={currentSelectedId === premiumOption.id}
                                onChange={() =>
                                  setSelectedQuotes((prev) => ({ ...prev, [group.storeId]: premiumOption.id }))
                                }
                                className="mt-0.5"
                              />
                              <div>
                                <strong className="block text-foreground font-semibold">
                                  🚀 Envio Prioritário Premium
                                </strong>
                                <span className="text-[11px] text-muted-foreground block mt-0.5">
                                  CJPacket Sensitive · {premiumEstimate.text}
                                </span>
                              </div>
                            </div>
                            <strong className="text-xs font-bold text-primary">Adicional de R$ 15,00</strong>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* INTEGRAÇÃO COM A ABA DE JOGOS: CUPOM ACUMULATIVO */}
              {!firstPurchaseEligible && bestGameCoupon && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/40 p-3.5 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="game-coupon"
                      checked={applyGameCoupon}
                      onCheckedChange={(checked) => setApplyGameCoupon(Boolean(checked))}
                    />
                    <div className="grid gap-0.5 leading-none">
                      <label
                        htmlFor="game-coupon"
                        className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Gamepad2 className="h-3.5 w-3.5 text-emerald-600" />
                        Usar cupom dos jogos (+{bestGameCoupon.percent_off}% OFF)
                      </label>
                      <p className="text-[11px] text-emerald-700 mt-1">
                        Acumule seus pontos da Roleta/Raspadinha sobre os 50% de desconto base da plataforma!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO DE GARANTIA PREMIUM HS DIGITAL */}
              <div className="rounded-xl border border-primary/20 bg-card p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Adicione um seguro</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Garantia Estendida Oficial HS Digital.
                </p>

                <div className="space-y-2 pt-1">
                  <label
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs transition ${
                      selectedWarrantyId === null ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="warranty-option"
                        checked={selectedWarrantyId === null}
                        onChange={() => setSelectedWarrantyId(null)}
                      />
                      <span>Sem garantia adicional</span>
                    </div>
                    <span className="font-semibold text-muted-foreground">R$ 0,00</span>
                  </label>

                  {WARRANTY_OPTIONS.map((opt) => {
                    const isSelected = selectedWarrantyId === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs transition ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="warranty-option"
                            checked={isSelected}
                            onChange={() => setSelectedWarrantyId(opt.id)}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{opt.title}</span>
                            {opt.tag && (
                              <span className="mt-0.5 inline-block w-fit rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                                {opt.tag}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {opt.originalAmount > opt.amount && (
                            <span className="mr-1.5 text-[11px] text-muted-foreground line-through">
                              {brl(opt.originalAmount)}
                            </span>
                          )}
                          <strong className="text-sm font-bold text-primary">{brl(opt.amount)}</strong>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <p className="text-[10px] leading-relaxed text-muted-foreground border-t border-border pt-2">
                  Ao adicionar, você aceita as Condições Gerais da Garantia Premium HS Digital. Cobertura aplicável
                  exclusivamente para falhas mecânicas ou defeitos de fabricação eletrônica natural. Estão
                  estritamente excluídos danos decorrentes de quebra física, quedas acidentais, contato com
                  água/umidade ou mau uso por parte do usuário.
                </p>
              </div>

              {/* RESUMO DE VALORES E TRAVA DE PREÇO */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold border-b border-border pb-2">Resumo do Pedido</h3>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal dos produtos</span>
                    <span className="text-foreground font-medium">{brl(subtotalProdutos)}</span>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Frete de referência</span>
                    <span className="line-through">{brl(FRETE_REFERENCIA_PLATAFORMA)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-600 font-medium">
                      {firstPurchaseEligible
                        ? "Desconto 1ª compra (100% OFF)"
                        : `Desconto de frete (${descontoPercentualFrete}% OFF)`}
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      - {brl((FRETE_REFERENCIA_PLATAFORMA * descontoPercentualFrete) / 100)}
                    </span>
                  </div>

                  {taxaFreteBase > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Frete base cobrado</span>
                      <span>{brl(taxaFreteBase)}</span>
                    </div>
                  )}

                  {adicionalFrete > 0 && (
                    <div className="flex justify-between text-primary font-medium">
                      <span>Adicional Envio Premium</span>
                      <span>+ {brl(adicionalFrete)}</span>
                    </div>
                  )}

                  {valorSeguro > 0 && (
                    <div className="flex justify-between text-primary font-medium">
                      <span>Garantia Premium</span>
                      <span>+ {brl(valorSeguro)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3 flex items-baseline justify-between">
                  <span className="text-sm font-bold">Total a pagar:</span>
                  <span className="text-xl font-extrabold text-foreground">{brl(totalPedido)}</span>
                </div>

                <Button className="w-full font-bold" size="lg" onClick={checkout} disabled={submitting}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {submitting ? "Criando pedido…" : `Concluir Pagamento · ${brl(totalPedido)}`}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  🔒 Checkout seguro via Mercado Pago com proteção total da transação.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
