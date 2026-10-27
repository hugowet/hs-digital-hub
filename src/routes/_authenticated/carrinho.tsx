import { sellerDisplayName } from "@/lib/seller-display";
// @ts-nocheck -- types out of sync with backend schema; see build log
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useDeliveryAddress } from "@/lib/delivery-context";
import { cartSavings, quotePriceChanged } from "@/lib/cart-savings";
import { deliveryDateRange, formatDeliveryRange } from "@/lib/delivery-estimate";

export const Route = createFileRoute("/_authenticated/carrinho")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
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
  const delivery = useDeliveryAddress();
  const addressLoaded = useRef(false);
  const quoteRequest = useRef(0);
  const [confirmedRequest, setConfirmedRequest] = useState("");
  const [priceChangeAccepted, setPriceChangeAccepted] = useState(true);
  const [clock, setClock] = useState(Date.now());

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const requestKey = JSON.stringify([items.filter((item) => item.productType !== "digital")
    .map((item) => [item.productId, item.quantity]).sort(), postalCode.replace(/\D/g, "")]);
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
        provider: string;
        amount: number;
        itemPrices?: Array<{ product_id: string; unit_price: number; quantity: number }>;
        supplierFreight?: number;
        embeddedFreeShipping?: boolean;
        deliveryDaysMin: number | null;
        deliveryDaysMax: number | null;
        expiresAt: string;
      }>;
    }>
  >([]);
  const [selectedQuotes, setSelectedQuotes] = useState<Record<string, string>>({});

  // Cupons ganhos nos jogos
  const [coupons, setCoupons] = useState<
    Array<{ id: string; code: string; percent_off: number; expires_at: string; status: string }>
  >([]);
  const [applyGameCoupon, setApplyGameCoupon] = useState(true);

  // Garantia Premium
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>(null);

  // Primeira Compra
  const [firstPurchaseEligible, setFirstPurchaseEligible] = useState(false);

  useEffect(() => {
    loadCoupons()
      .then((res) => {
        if (Array.isArray(res)) setCoupons(res);
      })
      .catch(() => {});

    loadFirstPurchaseEligibility()
      .then((res) => {
        if (res && typeof res.eligible === "boolean") {
          setFirstPurchaseEligible(res.eligible);
        }
      })
      .catch(() => {});
  }, [loadCoupons, loadFirstPurchaseEligibility]);

  const bestGameCoupon = useMemo(() => {
    return coupons.find(
      (c) => c.status === "active" && Number(c.percent_off) > 0 && new Date(c.expires_at).getTime() > Date.now()
    );
  }, [coupons]);

  // Calcula o valor total do frete baseado nas opções selecionadas
  const valorFreteCobrado = useMemo(() => {
    let sum = 0;
    for (const group of quotes) {
      const selectedId = selectedQuotes[group.storeId] || group.options[0]?.id;
      const match = group.options.find((o) => o.id === selectedId);
      if (match) {
        sum += Number(match.amount || 0);
      }
    }
    return Math.round(sum * 100) / 100;
  }, [quotes, selectedQuotes]);

  // Garantia Premium
  const selectedWarranty = WARRANTY_OPTIONS.find((w) => w.id === selectedWarrantyId) ?? null;
  const valorSeguro = selectedWarranty ? selectedWarranty.amount : 0;

  // Total travado
  const selectedOptions = quotes.map((group) => group.options.find((option) => option.id === selectedQuotes[group.storeId]) ?? group.options[0]).filter(Boolean);
  const pricedItems = selectedOptions.flatMap((option) => option.itemPrices ?? []);
  const subtotalProdutos = items.reduce((sum, item) => {
    const quoted = pricedItems.find((entry) => entry.product_id === item.productId && entry.quantity === item.quantity);
    return sum + (quoted ? Number(quoted.unit_price) : item.price) * item.quantity;
  }, 0);
  const embeddedShipping = selectedOptions.some((option) => option.embeddedFreeShipping);
  const firstPurchaseMargin = firstPurchaseEligible && !embeddedShipping && subtotalProdutos >= 89.9 && valorFreteCobrado > 0 ? 10 : 0;
  const totalPedido = Math.round((subtotalProdutos + valorFreteCobrado + valorSeguro + firstPurchaseMargin) * 100) / 100;
  const hasPhysicalItems = items.some((item) => item.productType !== "digital");
  const quotesReady = !hasPhysicalItems || (confirmedRequest === requestKey && selectedOptions.length === groups.filter((group) => group.items.some((item) => item.productType !== "digital")).length
    && selectedOptions.every((option) => Date.parse(option.expiresAt) > clock) && !quoting);
  const { data: referencePrices = [] } = useQuery({
    queryKey: ["cart-reference-prices", items.map((item) => item.productId).sort().join(",")],
    enabled: items.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,compare_at_price,supplier")
        .in("id", items.map((item) => item.productId));
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const economizou = cartSavings(items.map((item) => {
    const recorded = referencePrices.find((entry) => entry.id === item.productId);
    const quoted = pricedItems.find((entry) => entry.product_id === item.productId && entry.quantity === item.quantity);
    return { quantity: item.quantity, price: quoted ? Number(quoted.unit_price) : item.price,
      supplier: recorded?.supplier ?? item.supplier, compareAtPrice: recorded?.compare_at_price };
  }));

  useEffect(() => {
    if (items.length > 0) void trackCheckoutAbandonment(items);
  }, [items]);

  useEffect(() => {
    const data = delivery.address;
    if (!data || addressLoaded.current) return;
    addressLoaded.current = true;
        setName(data.recipient_name ?? "");
        setPhone(data.phone ?? "");
        setAddress(`${data.street_address ?? ""}${data.complement ? `, ${data.complement}` : ""}`);
        setCity(data.city ?? "");
        setState(data.state ?? "");
        setPostalCode(data.postal_code ?? "");
  }, [delivery.address]);

  useEffect(() => {
    quoteRequest.current += 1;
    setConfirmedRequest("");
    setQuotes([]);
    setSelectedQuotes({});
    if (postalCode.replace(/\D/g, "").length !== 8 || !hasPhysicalItems) { setQuoting(false); return; }
    setQuoting(true);
    const timer = setTimeout(() => void calculateShipping(), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function calculateShipping(customCep?: string) {
    const rawCep = (customCep ?? postalCode).replace(/\D/g, "");
    if (rawCep.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }
    const physicalItems = items.filter((i) => i.productType !== "digital");
    if (physicalItems.length === 0) return;

    const request = ++quoteRequest.current;
    const key = requestKey;
    setQuoting(true);
    setQuotes([]);
    setSelectedQuotes({});
    try {
      const quotesRes = await quoteShipping({
        data: {
          postalCode: rawCep,
          items: physicalItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });

      if (request !== quoteRequest.current) return;
      const confirmedItems = quotesRes.flatMap((group) => group.options[0]?.itemPrices ?? []);
      const priceChanged = physicalItems.some((item) => {
        const confirmed = confirmedItems.find((entry) => entry.product_id === item.productId && entry.quantity === item.quantity);
        return confirmed && quotePriceChanged(item.price, Number(confirmed.unit_price));
      });
      setPriceChangeAccepted(!priceChanged);
      setQuotes(quotesRes as any);
      setConfirmedRequest(key);
      setClock(Date.now());

      const defaults: Record<string, string> = {};
      for (const group of quotesRes as any) {
        if (group.options[0]) {
          defaults[group.storeId] = group.options[0].id;
        }
      }
      setSelectedQuotes(defaults);
      if (priceChanged) toast.info("O preço mudou para as condições atuais. Confira o novo total antes de continuar.");
    } catch (err: any) {
      if (request === quoteRequest.current) toast.error(err?.message || "Não foi possível calcular o frete para este CEP.");
    } finally {
      if (request === quoteRequest.current) setQuoting(false);
    }
  }

  async function handleCheckout() {
    if (items.length === 0) return;
    const hasPhysical = items.some((i) => i.productType !== "digital");

    if (hasPhysical) {
      if (!name || !phone || !address || !city || !state || !postalCode) {
        toast.error("Preencha todos os campos do endereço de entrega.");
        return;
      }
      if (!quotesReady || !priceChangeAccepted) {
        toast.error(!priceChangeAccepted ? "Confirme o novo preço antes de continuar." : "Confirme novamente o preço e envio para continuar.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const shippingQuoteIds = Object.fromEntries(
        Object.entries(selectedQuotes).filter(([, quoteId]) => Boolean(quoteId)),
      );

      const res = await createCheckout({
        data: {
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          shippingAddress: hasPhysical
            ? {
                name,
                phone,
                address,
                city,
                state,
                postalCode: postalCode.replace(/\D/g, ""),
                note: note || "",
              }
            : undefined,
          shippingQuoteIds,
          couponId: applyGameCoupon && bestGameCoupon && valorFreteCobrado > 0 && subtotalProdutos < 89.9 ? bestGameCoupon.id : undefined,
          warranty:
            selectedWarranty && selectedWarranty.amount > 0
              ? { id: selectedWarranty.id, title: selectedWarranty.title, amount: selectedWarranty.amount }
              : undefined,
        },
      });

      if (res?.orderId) {
        // Navegação interna (sem recarregar a página) evita tela branca ao voltar
        navigate({ to: "/pedido/$orderId", params: { orderId: res.orderId } });
      } else {
        toast.error("Não foi possível gerar o link de pagamento. Tente novamente.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Truck className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Explore milhares de produtos importados e nacionais com envio prioritário.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Continuar Comprando</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="container mx-auto flex-1 p-4 md:p-8 max-w-6xl">
        <h1 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-2">
          <span>Seu Carrinho</span>
          <span className="text-sm font-normal text-muted-foreground">({items.length} itens)</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Lista de Produtos agrupados por loja */}
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.storeId} className="rounded-xl border border-border bg-card p-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b pb-3 mb-3 text-xs font-semibold text-muted-foreground">
                  <Store className="h-4 w-4" />
                  <span>Vendido e entregue por {sellerDisplayName(group.storeName)}</span>
                </div>

                <div className="divide-y divide-border">
                  {group.items.map((item) => (
                    <div key={item.productId} className="py-3 flex gap-3 items-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-16 w-16 object-contain rounded-md border bg-muted/20 p-1 shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-md border bg-muted/20 flex items-center justify-center shrink-0">
                          <Truck className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <Link
                          to="/produto/$productId"
                          params={{ productId: item.productId }}
                          className="text-xs md:text-sm font-medium line-clamp-2 hover:text-primary leading-snug"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm md:text-base font-bold">{brl(pricedItems.find((entry) => entry.product_id === item.productId && entry.quantity === item.quantity)?.unit_price ?? item.price)}</span>
                          <span className="text-[11px] text-muted-foreground">cada</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
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
                  placeholder="Telefone (com DDD) *"
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

            {/* SELEÇÃO DAS OPÇÕES DE ENVIO */}
            {quotes.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Modalidade de Envio</h3>
                </div>

                {quotes.map((group) => {
                  const currentSelectedId = selectedQuotes[group.storeId] || group.options[0]?.id;
                  return (
                    <div key={group.storeId} className="space-y-2">
                      <p className="text-xs text-muted-foreground">{sellerDisplayName(group.storeName)}</p>
                      {group.options[0]?.provider === "cj" && <p className="text-xs font-semibold text-primary">Produtos internacionais · envio do exterior</p>}
                      {group.options.map((option) => (
                        <label key={option.id} className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-xs ${currentSelectedId === option.id ? "border-primary bg-primary/5" : "border-border"}`}>
                          <div className="flex min-w-0 gap-2">
                            <input type="radio" name={`shipping-${group.storeId}`} checked={currentSelectedId === option.id} onChange={() => setSelectedQuotes((prev) => ({ ...prev, [group.storeId]: option.id }))} />
                            <div><strong className="block">{option.serviceName}</strong>
                              <span className="block text-muted-foreground">{option.carrierName}</span>
                              <span className="block text-muted-foreground">{formatDeliveryRange(deliveryDateRange(option.deliveryDaysMin, option.deliveryDaysMax, new Date(clock), option.provider === "melhor_envio"))}</span>
                            </div>
                          </div>
                          <strong className="shrink-0">{option.amount === 0 ? "Frete incluso" : `+${brl(option.amount)}`}</strong>
                        </label>
                      ))}
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">Estimativa se enviado hoje. O prazo começa no envio após o pagamento confirmado; preparação, feriados e alfândega podem alterar as datas.</p>
              </div>
            )}

            {/* SELEÇÃO DE GARANTIA ESTENDIDA */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Garantia Blindada HS</h3>
              </div>

              <div className="space-y-1.5">
                {WARRANTY_OPTIONS.map((warranty) => (
                  <label
                    key={warranty.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs transition ${
                      selectedWarrantyId === warranty.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="warranty-selection"
                        checked={selectedWarrantyId === warranty.id}
                        onChange={() => setSelectedWarrantyId(warranty.id)}
                      />
                      <span>{warranty.title}</span>
                      {warranty.tag && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                          {warranty.tag}
                        </span>
                      )}
                    </div>
                    <strong>+{brl(warranty.amount)}</strong>
                  </label>
                ))}

                <button
                  type="button"
                  onClick={() => setSelectedWarrantyId(null)}
                  className="text-[11px] text-muted-foreground hover:underline block pt-1"
                >
                  Continuar apenas com a garantia padrão de 90 dias
                </button>
              </div>
            </div>

            {/* RESUMO DO PEDIDO */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold border-b pb-2">Resumo do Pedido</h3>

              <div className="space-y-1.5 text-xs">
                {economizou > 0 && <div data-testid="cart-savings" className="flex items-center justify-between gap-2 rounded-md bg-primary/5 p-2 font-semibold text-primary">
                  <span>Você economizou</span><span>{brl(economizou)}</span>
                </div>}
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal produtos</span>
                  <span>{brl(subtotalProdutos)}</span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>{embeddedShipping && valorFreteCobrado > 0 ? "Adicional Premium" : "Frete"}</span>
                  {!embeddedShipping && subtotalProdutos >= 89.9 && valorFreteCobrado > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span className="line-through opacity-60">{brl(valorFreteCobrado)}</span>
                      <span className="font-bold text-[#00a650]">Grátis 🎉</span>
                    </span>
                  ) : (
                    <span className={valorFreteCobrado === 0 && quotes.length > 0 ? "font-bold text-[#00a650]" : ""}>
                      {quotes.length === 0 ? "A calcular" : valorFreteCobrado === 0 ? "Grátis" : brl(valorFreteCobrado)}
                    </span>
                  )}
                </div>

                {(embeddedShipping || (subtotalProdutos >= 89.9 && valorFreteCobrado > 0)) && (
                  <p className="text-[10px] font-semibold text-[#00a650]">
                    {firstPurchaseEligible
                      ? "Frete grátis na sua primeira compra."
                      : "Frete grátis."}
                  </p>
                )}

                {subtotalProdutos < 89.9 && subtotalProdutos > 0 && (
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    Faltam {brl(Math.round((89.9 - subtotalProdutos) * 100) / 100)} para você ganhar frete grátis 🚚
                  </p>
                )}

                {firstPurchaseMargin > 0 && <div className="flex justify-between text-muted-foreground"><span>Ajuste da primeira compra</span><span>{brl(firstPurchaseMargin)}</span></div>}

                {valorSeguro > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Garantia estendida</span>
                    <span>{brl(valorSeguro)}</span>
                  </div>
                )}

                <div className="border-t pt-2 flex justify-between text-sm font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-lg text-primary">{brl(totalPedido)}</span>
                </div>
              </div>

              {!priceChangeAccepted && quotesReady && <div role="alert" className="space-y-2 text-xs text-muted-foreground">
                <p>O preço foi atualizado para o endereço, os itens ou a validade atual da cotação. Confira o total.</p>
                <Button variant="outline" size="sm" onClick={() => setPriceChangeAccepted(true)}>Aceitar novo total</Button>
              </div>}
              {hasPhysicalItems && !quotesReady && !quoting && quotes.length > 0 && <div role="alert" className="space-y-2 text-xs text-muted-foreground">
                <p>A cotação venceu. Confirme o preço novamente antes de pagar.</p>
                <Button variant="outline" size="sm" onClick={() => void calculateShipping()}>Atualizar cotação</Button>
              </div>}

              <Button
                size="lg"
                className="w-full font-bold mt-4 shadow-md"
                onClick={handleCheckout}
                disabled={submitting || quoting || !quotesReady || !priceChangeAccepted}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" /> Concluir Pedido
                  </>
                )}
              </Button>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
