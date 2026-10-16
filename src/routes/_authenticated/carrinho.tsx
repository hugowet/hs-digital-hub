import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CreditCard, Loader2, Minus, Plus, ShieldCheck, Store, TicketPercent, Trash2, Truck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        content: "Revise seus itens por loja e pague com Pix ou cartão na HS Digital.",
      },
      { property: "og:title", content: "Carrinho · HS Digital" },
      {
        property: "og:description",
        content: "Carrinho multi-loja da HS Digital com pagamento protegido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

/**
 * Função utilitária que calcula a previsão dinâmica de entrega (12 a 18 dias úteis),
 * pulando rigorosamente sábados e domingos a partir da data de acesso atual.
 */
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
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const minDay = minDate.getDate();
  const maxDay = maxDate.getDate();
  const minMonth = months[minDate.getMonth()];
  const maxMonth = months[maxDate.getMonth()];

  const text = minMonth === maxMonth
    ? `Chegará entre os dias ${minDay} e ${maxDay} de ${minMonth}.`
    : `Chegará entre os dias ${minDay} de ${minMonth} e ${maxDay} de ${maxMonth}.`;

  return { minDay, maxDay, text };
}

const WARRANTY_OPTIONS = [
  { id: "1_year", title: "1 ano", amount: 5.0, originalAmount: 5.0, tag: null },
  { id: "1_5_years", title: "1 ano e meio", amount: 6.0, originalAmount: 6.0, tag: null },
  { id: "2_years", title: "2 anos (Recomendado)", amount: 7.0, originalAmount: 8.75, tag: "Economize R$ 1,75" },
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
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [firstPurchaseEligible, setFirstPurchaseEligible] = useState(false);

  // Estado para seleção da Garantia Premium HS Digital
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>(null);

  // REGRA DE OURO 1: Identificação de produtos com logística CJ Dropshipping
  const isDropshipping = true;

  // Cálculo da previsão dinâmica de entrega (12 a 18 dias úteis)
  const deliveryEstimate = useMemo(() => getDeliveryEstimate(new Date(), 12, 18), []);

  // Frete nominal retornado pelas opções
  const rawShipping = quotes.reduce((sum, group) => {
    const selected = group.options.find((option) => option.id === selectedQuotes[group.storeId]);
    return sum + (selected?.amount ?? 0);
  }, 0);

  // REGRA DE OURO 2: Para isDropshipping = true, valorFreteCobrado É ESTRITAMENTE 0
  const valorFreteCobrado = isDropshipping ? 0 : rawShipping;

  const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId);
  const requestedCouponDiscount = selectedCoupon
    ? selectedCoupon.kind === "free_shipping"
      ? Math.min(valorFreteCobrado, Number(selectedCoupon.max_discount))
      : Math.min((valorFreteCobrado * Number(selectedCoupon.percent_off)) / 100, Number(selectedCoupon.max_discount))
    : 0;
  const couponDiscount = Math.min(requestedCouponDiscount, subtotal * 0.12);
  const shippingDiscount = firstPurchaseEligible ? valorFreteCobrado : couponDiscount;

  // Valor do seguro selecionado
  const selectedWarranty = WARRANTY_OPTIONS.find((w) => w.id === selectedWarrantyId) ?? null;
  const valorSeguro = selectedWarranty ? selectedWarranty.amount : 0;

  // REGRA DE OURO 3: totalPedido = subtotalProdutos + valorFreteCobrado + valorSeguro
  const subtotalProdutos = subtotal;
  const totalPedido = subtotalProdutos + valorFreteCobrado - shippingDiscount + valorSeguro;

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
          items.filter((coupon) => coupon.status === "active" && new Date(coupon.expires_at).getTime() > Date.now()),
        ),
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
          const cheapest = [...group.options].sort((a, b) => a.amount - b.amount)[0];
          return [group.storeId, cheapest?.id ?? ""];
        }),
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
      }
    }

    if (physicalStoreIds.some((storeId) => !quotesToUse[storeId])) {
      toast.error("Por favor, selecione uma opção de frete para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      const { orderId } = await createCheckout({
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
          couponId: selectedCouponId || undefined,
          warranty: selectedWarranty
            ? {
                id: selectedWarranty.id,
                title: selectedWarranty.title,
                amount: selectedWarranty.amount,
              }
            : undefined,
        },
      });
      setSubmitting(false);
      navigate({ to: "/pedido/$orderId", params: { orderId } });
    } catch (error) {
      setSubmitting(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o pedido.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Meu carrinho</h1>

        {items.length === 0 ? (
          <div className="surface-card mt-6 p-10 text-center">
            <p className="text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            <Button asChild className="mt-4">
              <Link to="/">Ver ofertas</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.storeId} className="surface-card overflow-hidden">
                  <header className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3 text-sm font-semibold">
                    <Store className="h-4 w-4 text-primary" />
                    {group.storeName}
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      Subtotal {brl(group.subtotal)}
                    </span>
                  </header>
                  <ul className="divide-y divide-border">
                    {group.items.map((item) => (
                      <li key={item.productId} className="flex gap-3 p-4">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            loading="lazy"
                            className="h-20 w-20 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                          <p className="mt-1 font-display font-bold text-primary">{brl(item.price)}</p>
                          {isDropshipping && (
                            <span className="mt-1 inline-block rounded bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                              ✓ Envio Incluso
                            </span>
                          )}
                          {item.productType === "digital" && (
                            <span className="mt-1 inline-block rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
                              Entrega digital
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center rounded-lg border border-border">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setQuantity(item.productId, item.quantity - 1)}
                              aria-label="Diminuir"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              aria-label="Aumentar"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{item.stock} disponíveis</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(item.productId)}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <aside className="surface-card h-fit p-4 lg:sticky lg:top-32">
              <h2 className="text-base font-semibold">Resumo do pedido</h2>

              {/* Previsão de Entrega Estilo Mercado Livre */}
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/10 p-3 text-xs leading-relaxed text-success">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div>
                  <strong className="block text-sm font-semibold">🚚 Frete Grátis</strong>
                  <span>{deliveryEstimate.text}</span>
                </div>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Produtos</dt>
                  <dd>{brl(subtotalProdutos)}</dd>
                </div>

                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Frete</dt>
                  <dd className="font-semibold text-success">
                    {isDropshipping ? "Grátis (Incluso)" : valorFreteCobrado === 0 ? "Grátis" : brl(valorFreteCobrado)}
                  </dd>
                </div>

                {valorSeguro > 0 && selectedWarranty && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Garantia ({selectedWarranty.title})</dt>
                    <dd className="font-medium">{brl(valorSeguro)}</dd>
                  </div>
                )}

                <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-bold">
                  <dt>Total</dt>
                  <dd className="text-primary">{brl(totalPedido)}</dd>
                </div>
              </dl>

              {/* Dados de entrega */}
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold">Dados de entrega</p>
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">CEP *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="postalCode"
                      inputMode="numeric"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="00000000"
                    />
                    <Button type="button" variant="outline" onClick={() => void calculateShipping()} disabled={quoting}>
                      {quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    placeholder="(92) 99999-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Endereço *</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={200}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="grid grid-cols-[1fr_72px] gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      maxLength={100}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">UF *</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                      maxLength={2}
                      placeholder="UF"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note">Observações</Label>
                  <Input
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={200}
                    placeholder="Ponto de referência, etc."
                  />
                </div>
              </div>

              {/* Opções de Logística com Envio Incluso */}
              {quotes.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Truck className="h-4 w-4 text-primary" /> Modalidade de Envio
                  </p>
                  {quotes.map((group) => (
                    <div key={group.storeId} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">{group.storeName}</p>
                      {group.options.map((option) => (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                            selectedQuotes[group.storeId] === option.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`shipping-${group.storeId}`}
                            checked={selectedQuotes[group.storeId] === option.id}
                            onChange={() =>
                              setSelectedQuotes((current) => ({ ...current, [group.storeId]: option.id }))
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <strong className="block text-foreground">{option.serviceName}</strong>
                            <span className="text-xs text-muted-foreground">
                              {option.carrierName} · {deliveryEstimate.text}
                            </span>
                          </span>
                          <strong className="text-xs font-bold uppercase tracking-wide text-success">
                            {isDropshipping ? "Envio Incluso" : option.amount === 0 ? "Grátis" : brl(option.amount)}
                          </strong>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* SEÇÃO DE GARANTIA PREMIUM HS DIGITAL */}
              <div className="mt-5 rounded-xl border border-primary/20 bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Adicione um seguro</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Proteja sua compra com a Garantia Estendida Premium HS Digital.
                </p>

                <div className="mt-3 space-y-2">
                  {/* Opção sem seguro */}
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

                  {/* 3 Opções fixas de seguro */}
                  {WARRANTY_OPTIONS.map((opt) => {
                    const isSelected = selectedWarrantyId === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs transition ${
                          isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/30"
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
                              <span className="mt-0.5 inline-block w-fit rounded bg-success/15 px-1.5 py-0.2 text-[10px] font-bold text-success">
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

                {/* Termos de Proteção */}
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground border-t border-border/60 pt-2">
                  Ao adicionar, você aceita as Condições Gerais da Garantia Premium HS Digital. Cobertura aplicável
                  exclusivamente para falhas mecânicas ou defeitos de fabricação eletrônica natural. Estão estritamente
                  excluídos danos decorrentes de quebra física, quedas acidentais, contato com água/umidade ou mau uso por
                  parte do usuário.
                </p>
              </div>

              {/* Botão de Pagamento */}
              <Button className="mt-4 w-full" size="lg" onClick={checkout} disabled={submitting}>
                <CreditCard className="mr-2 h-5 w-5" />
                {submitting ? "Criando pedido…" : `Ir para o pagamento · ${brl(totalPedido)}`}
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Pagamento seguro por Pix ou cartão via Mercado Pago com proteção total.
              </p>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
