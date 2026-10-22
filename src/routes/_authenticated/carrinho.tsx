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

  const [coupons, setCoupons] = useState<
    Array<{ id: string; code: string; percent_off: number; expires_at: string; status: string }>
  >([]);
  const [applyGameCoupon, setApplyGameCoupon] = useState(true);

  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>("2_years");
  const [firstPurchaseEligible, setFirstPurchaseEligible] = useState(false);

  const expressEstimate = useMemo(() => getDeliveryEstimate(new Date(), 12, 18), []);
  const premiumEstimate = useMemo(() => getDeliveryEstimate(new Date(), 8, 14), []);

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

  const selectedWarranty = WARRANTY_OPTIONS.find((w) => w.id === selectedWarrantyId) ?? null;
  const valorSeguro = selectedWarranty ? selectedWarranty.amount : 0;

  const subtotalProdutos = subtotal;
  const totalPedido = Math.round((subtotalProdutos + valorFreteCobrado + valorSeguro) * 100) / 100;

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

  // CÁLCULO AUTOMÁTICO DE FRETE AO DIGITAR 8 DÍGITOS OU QUANDO OS ITENS MUDAREM
  useEffect(() => {
    const clean = postalCode.replace(/\D/g, "");
    if (clean.length === 8 && items.length > 0) {
      const timer = setTimeout(() => {
        void calculateShipping(clean, false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [postalCode, items]);

  async function calculateShipping(customCep?: string, showToast = true) {
    const rawCep = (customCep ?? postalCode).replace(/\D/g, "");
    if (rawCep.length !== 8) {
      if (showToast) toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }
    const physicalItems = items.filter((i) => i.productType !== "digital");
    if (physicalItems.length === 0) return;

    setQuoting(true);
    try {
      // 1. Assegura sessão válida e não expirada antes de requisitar
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const isExpired = session?.expires_at ? session.expires_at * 1000 < Date.now() + 30_000 : true;

      if (!session || isExpired) {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) {
          toast.error("Sua sessão expirou. Faça login novamente para calcular o frete.");
          navigate({ to: "/auth", search: { reason: "login-required", redirect: "/carrinho" } });
          return;
        }
      }

      const quotesRes = await quoteShipping({
        data: {
          postalCode: rawCep,
          items: physicalItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });

      setQuotes(quotesRes as any);

      const defaults: Record<string, string> = {};
      for (const group of quotesRes as any) {
        if (group.options[0]) {
          defaults[group.storeId] = group.options[0].id;
        }
      }
      setSelectedQuotes((prev) => ({ ...defaults, ...prev }));
      if (showToast) toast.success("Opções de envio calculadas com sucesso!");
    } catch (err: any) {
      // 2. Se ainda assim houver erro de token, tenta forçar novo refresh e reexecuta
      if (err?.message?.includes("token") || err?.message?.includes("Unauthorized")) {
        try {
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr) {
            const retryRes = await quoteShipping({
              data: {
                postalCode: rawCep,
                items: physicalItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
              },
            });
            setQuotes(retryRes as any);
            const defaults: Record<string, string> = {};
            for (const group of retryRes as any) {
              if (group.options[0]) defaults[group.storeId] = group.options[0].id;
            }
            setSelectedQuotes((prev) => ({ ...defaults, ...prev }));
            if (showToast) toast.success("Opções de envio calculadas com sucesso!");
            return;
          }
        } catch {
          // Continua para o tratamento de erro
        }
        toast.error("Sessão expirada. Por favor, entre novamente na sua conta.");
        navigate({ to: "/auth", search: { reason: "login-required", redirect: "/carrinho" } });
        return;
      }
      if (showToast) {
        toast.error(err?.message || "Não foi possível calcular o frete para este CEP.");
      }
    } finally {
      setQuoting(false);
    }
  }

      const quotesRes = await quoteShipping({
        data: {
          postalCode: rawCep,
          items: physicalItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });

      setQuotes(quotesRes as any);

      const defaults: Record<string, string> = {};
      for (const group of quotesRes as any) {
        if (group.options[0]) {
          defaults[group.storeId] = group.options[0].id;
        }
      }
      setSelectedQuotes((prev) => ({ ...defaults, ...prev }));
      if (showToast) toast.success("Opções de envio calculadas com sucesso!");
    } catch (err: any) {
      // 2. Se houver falha de token, tenta renovar e recalcular automaticamente
      if (err?.message?.includes("token") || err?.message?.includes("Unauthorized")) {
        try {
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr) {
            const retryRes = await quoteShipping({
              data: {
                postalCode: rawCep,
                items: physicalItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
              },
            });
            setQuotes(retryRes as any);
            const defaults: Record<string, string> = {};
            for (const group of retryRes as any) {
              if (group.options[0]) defaults[group.storeId] = group.options[0].id;
            }
            setSelectedQuotes((prev) => ({ ...defaults, ...prev }));
            if (showToast) toast.success("Opções de envio calculadas com sucesso!");
            return;
          }
        } catch {
          // Continua para o tratamento de erro padrão
        }
      }
      if (showToast) {
        toast.error(err?.message || "Não foi possível calcular o frete para este CEP.");
      }
    } finally {
      setQuoting(false);
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
      if (quotes.length === 0) {
        toast.error("Calcule o frete informando seu CEP antes de continuar.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const selectedQuotesList = Object.entries(selectedQuotes).map(([storeId, quoteId]) => ({
        storeId,
        quoteId,
      }));

      const res = await createCheckout({
        data: {
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            warrantyId: selectedWarrantyId ?? undefined,
          })),
          shippingQuotes: selectedQuotesList,
          address: hasPhysical
            ? {
                recipientName: name,
                phone,
                streetAddress: address,
                city,
                state,
                postalCode: postalCode.replace(/\D/g, ""),
                note: note || undefined,
              }
            : undefined,
          appliedCouponCode: applyGameCoupon && bestGameCoupon ? bestGameCoupon.code : undefined,
        },
      });

      if (res?.paymentUrl) {
        window.location.href = res.paymentUrl;
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
            Navegue pelos produtos e adicione suas compras ao carrinho para continuar.
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
      <main className="container mx-auto max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Carrinho de Compras</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Continuar Comprando</Link>
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Lista de Itens por Loja */}
          <div className="lg:col-span-2 space-y-6">
            {groups.map((group) => (
              <section key={group.storeId} className="rounded-xl border border-border bg-card p-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4 text-sm font-semibold">
                  <Store className="h-4 w-4 text-primary" />
                  <span>{group.storeName}</span>
                </div>

                <div className="divide-y divide-border">
                  {group.items.map((item) => (
                    <div key={item.productId} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-start">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-20 w-20 rounded-md object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                          Sem foto
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="font-bold text-base">{brl(item.price)}</span>
                          <span className="text-xs text-muted-foreground">unidade</span>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center border border-border rounded-md">
                            <button
                              type="button"
                              onClick={() => setQuantity(item.productId, item.quantity - 1)}
                              className="px-2 py-1 text-muted-foreground hover:text-foreground"
                              aria-label="Diminuir quantidade"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(item.productId, item.quantity + 1)}
                              className="px-2 py-1 text-muted-foreground hover:text-foreground"
                              aria-label="Aumentar quantidade"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(item.productId)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            aria-label="Remover item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm">{brl(item.price * item.quantity)}</span>
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
                    onClick={() => calculateShipping(undefined, true)}
                    disabled={quoting}
                  >
                    {quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="name" className="text-xs">
                  Nome Completo *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs">
                  Telefone / WhatsApp *
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-xs">
                  Endereço com Número *
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro, Compl."
                  className="text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="city" className="text-xs">
                    Cidade *
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-xs">
                    Estado *
                  </Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                    className="text-xs mt-1 uppercase"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="note" className="text-xs">
                  Ponto de Referência (Opcional)
                </Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Próximo à praça..."
                  className="text-xs mt-1"
                />
              </div>
            </div>

            {/* OPÇÕES DE FRETE POR LOJA */}
            {quotes.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-primary" /> Modalidades de Envio
                </h3>

                {quotes.map((group) => (
                  <div key={group.storeId} className="space-y-2 border-b border-border pb-3 last:border-b-0 last:pb-0">
                    <p className="text-xs font-semibold text-muted-foreground">{group.storeName}</p>
                    <div className="space-y-2">
                      {group.options.map((opt) => {
                        const isSelected = (selectedQuotes[group.storeId] || group.options[0]?.id) === opt.id;
                        const isYunExpress = opt.serviceCode.includes("yunexpress") || opt.carrierName.includes("YunExpress");
                        const estimate = isYunExpress ? expressEstimate : premiumEstimate;

                        return (
                          <label
                            key={opt.id}
                            className={`flex cursor-pointer items-start justify-between rounded-lg border p-2.5 transition text-xs ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/40"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="radio"
                                name={`shipping-${group.storeId}`}
                                checked={isSelected}
                                onChange={() =>
                                  setSelectedQuotes((prev) => ({ ...prev, [group.storeId]: opt.id }))
                                }
                                className="mt-0.5"
                              />
                              <div>
                                <p className="font-semibold text-foreground">{opt.serviceName}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{estimate.text}</p>
                              </div>
                            </div>
                            <span className="font-bold text-foreground">
                              {opt.amount === 0 ? "Grátis" : brl(opt.amount)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GARANTIA ESTENDIDA */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Garantia Estendida
              </h3>
              <div className="space-y-2">
                {WARRANTY_OPTIONS.map((w) => {
                  const isSelected = selectedWarrantyId === w.id;
                  return (
                    <label
                      key={w.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition text-xs ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-500/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="warranty"
                          checked={isSelected}
                          onChange={() => setSelectedWarrantyId(w.id)}
                        />
                        <div>
                          <p className="font-semibold">{w.title}</p>
                          {w.tag && <span className="text-[10px] text-emerald-600 font-bold">{w.tag}</span>}
                        </div>
                      </div>
                      <span className="font-bold">{brl(w.amount)}</span>
                    </label>
                  );
                })}

                <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    name="warranty"
                    checked={selectedWarrantyId === null}
                    onChange={() => setSelectedWarrantyId(null)}
                  />
                  <span>Sem garantia adicional (apenas garantia legal)</span>
                </label>
              </div>
            </div>

            {/* RESUMO DO PEDIDO */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold">Resumo do Pedido</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal dos produtos</span>
                  <span>{brl(subtotalProdutos)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{valorFreteCobrado === 0 ? "Grátis" : brl(valorFreteCobrado)}</span>
                </div>

                {valorSeguro > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Garantia Estendida</span>
                    <span>{brl(valorSeguro)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{brl(totalPedido)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={submitting}
                className="w-full bg-[#00a650] hover:bg-[#008f45] text-white font-bold h-11 text-sm shadow-md"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1.5 fill-current" /> Finalizar Pedido
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
