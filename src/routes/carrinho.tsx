import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CreditCard, Gift, Minus, Plus, Store, Tag, Ticket, Trash2, Truck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho · HS Digital" },
      {
        name: "description",
        content: "Revise seus itens por loja, aproveite cupons de frete grátis e pague com Pix ou cartão.",
      },
      { property: "og:title", content: "Carrinho · HS Digital" },
      {
        property: "og:description",
        content: "Carrinho multi-loja da HS Digital com cupons e frete grátis na primeira compra.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CartPage,
});

// Cupons ativos estilo Shopee
const AVAILABLE_COUPONS = [
  {
    code: "PRIMEIRACOMPRA",
    title: "Frete Grátis na 1ª Compra",
    description: "Válido para todo o Brasil em compras de qualquer valor.",
    type: "free_shipping",
  },
  {
    code: "FRETEGRATIS",
    title: "Cupom Frete Grátis Oficial",
    description: "Zere o valor do frete para todos os produtos do carrinho.",
    type: "free_shipping",
  },
  {
    code: "HS10",
    title: "10% de Desconto",
    description: "10% de desconto em todo o subtotal do pedido.",
    type: "discount_percent",
    discount: 0.1,
  },
];

export function CartPage() {
  const { items, setQuantity, remove, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const createCheckout = useServerFn(createMarketplaceCheckout);
  const groups = groupByStore(items);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Cupons e Frete Grátis 1ª Compra
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(() => {
    // Se o usuário nunca comprou, já pré-aplica o benefício de primeira compra
    const hasOrdered = typeof window !== "undefined" ? localStorage.getItem("hs_has_completed_order") : null;
    return !hasOrdered ? "PRIMEIRACOMPRA" : null;
  });

  // Cálculo de frete base
  const rawShipping = groups.reduce(
    (sum, g) => sum + (g.items.every((i) => i.freeShipping || i.productType === "digital") ? 0 : 19.9),
    0,
  );

  // Frete após cupom
  const isFreeShippingActive =
    appliedCoupon === "PRIMEIRACOMPRA" || appliedCoupon === "FRETEGRATIS";

  const finalShipping = isFreeShippingActive ? 0 : rawShipping;

  // Desconto no produto
  const discountAmount = appliedCoupon === "HS10" ? subtotal * 0.1 : 0;
  const total = Math.max(0, subtotal - discountAmount + finalShipping);

  useEffect(() => {
    if (items.length > 0) void trackCheckoutAbandonment(items);
  }, [items]);

  useEffect(() => {
    supabase
      .from("user_addresses")
      .select("recipient_name,phone,street_address,city,state,complement")
      .eq("is_default", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setName(data.recipient_name || "");
        setPhone(data.phone || "");
        setAddress(`${data.street_address || ""}${data.complement ? `, ${data.complement}` : ""}`);
        setCity(`${data.city || ""}/${data.state || ""}`);
      });
  }, []);

  const handleApplyCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    const found = AVAILABLE_COUPONS.find((c) => c.code === clean);
    if (!found) {
      toast.error("Cupom inválido ou expirado.");
      return;
    }
    setAppliedCoupon(clean);
    toast.success(`Cupom ${clean} aplicado com sucesso!`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Cupom removido.");
  };

  const checkout = async () => {
    if (!name.trim() || !address.trim() || !city.trim()) {
      toast.error("Preencha nome, endereço e cidade para entrega.");
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
            note: `${note.trim()}${appliedCoupon ? ` [Cupom: ${appliedCoupon}]` : ""}`,
          },
        },
      });

      // Marca que o usuário já realizou compra
      localStorage.setItem("hs_has_completed_order", "true");
      setSubmitting(false);
      navigate({ to: "/pedido/$orderId", params: { orderId } });
    } catch (error) {
      setSubmitting(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o pedido.");
    }
  };

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <h1 className="text-2xl font-bold">Meu carrinho</h1>

        {items.length === 0 ? (
          <div className="rounded-lg bg-white mt-6 p-12 text-center shadow-sm">
            <p className="text-sm text-gray-500">Seu carrinho está vazio.</p>
            <Button asChild className="mt-4 bg-[#3483fa] hover:bg-[#2968c8]">
              <Link to="/">Ver ofertas</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* LADO ESQUERDO: ITENS E CUPONS ESTILO SHOPEE */}
            <div className="space-y-4">
              
              {/* BANNER 1ª COMPRA / CUPONS ESTILO SHOPEE */}
              <div className="rounded-lg border border-green-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-[#00a650]">
                  <Ticket className="h-5 w-5" />
                  <span>Cupons de Desconto & Frete Grátis</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Clique para aplicar seu cupom ou digite abaixo:
                </p>

                {/* Lista de Cupons com 1 Clique */}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {AVAILABLE_COUPONS.map((c) => {
                    const isSelected = appliedCoupon === c.code;
                    return (
                      <div
                        key={c.code}
                        className={`flex items-center justify-between rounded-md border p-2.5 text-xs transition-all ${
                          isSelected
                            ? "border-[#00a650] bg-green-50/70"
                            : "border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5 text-[#00a650]" /> {c.code}
                          </p>
                          <p className="text-[11px] text-gray-500">{c.title}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          className={`h-7 px-3 text-[11px] font-bold ${
                            isSelected
                              ? "bg-[#00a650] hover:bg-[#008f45] text-white"
                              : "border-[#00a650] text-[#00a650] hover:bg-green-50"
                          }`}
                          onClick={() => (isSelected ? handleRemoveCoupon() : handleApplyCoupon(c.code))}
                        >
                          {isSelected ? "Aplicado ✓" : "Aplicar"}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Campo de Cupom Manual */}
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Possui outro cupom?"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="h-9 text-xs uppercase"
                  />
                  <Button
                    size="sm"
                    className="h-9 bg-[#3483fa] hover:bg-[#2968c8] text-white text-xs font-semibold px-4"
                    onClick={() => {
                      handleApplyCoupon(couponInput);
                      setCouponInput("");
                    }}
                  >
                    Validar
                  </Button>
                </div>
              </div>

              {/* LISTA DE PRODUTOS POR LOJA */}
              {groups.map((group) => (
                <section key={group.storeId} className="rounded-lg bg-white border border-gray-200 overflow-hidden shadow-sm">
                  <header className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                    <Store className="h-4 w-4 text-[#3483fa]" />
                    {group.storeName}
                    <span className="ml-auto text-xs font-normal text-gray-500">
                      Subtotal {brl(group.subtotal)}
                    </span>
                  </header>
                  <ul className="divide-y divide-gray-100">
                    {group.items.map((item) => (
                      <li key={item.productId} className="flex gap-3 p-4">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            loading="lazy"
                            className="h-20 w-20 shrink-0 rounded-lg object-contain border p-1"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.title}</p>
                          <p className="mt-1 font-bold text-gray-900 text-base">
                            {brl(item.price)}
                          </p>
                          {(item.freeShipping || item.productType === "digital" || isFreeShippingActive) && (
                            <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-[11px] font-bold text-[#00a650]">
                              {item.productType === "digital" ? "Entrega digital imediata" : "Frete Grátis Aplicado"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-600"
                              onClick={() => setQuantity(item.productId, item.quantity - 1)}
                              aria-label="Diminuir"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-600"
                              onClick={() => setQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              aria-label="Aumentar"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {item.stock} disponíveis
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
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

            {/* RESUMO DO PEDIDO E DADOS DE ENTREGA */}
            <aside className="rounded-lg bg-white border border-gray-200 p-5 shadow-sm h-fit lg:sticky lg:top-24">
              <h2 className="text-base font-bold text-gray-900 border-b pb-3">Resumo da compra</h2>
              
              <dl className="mt-4 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600">
                  <dt>Produtos ({items.reduce((acc, i) => acc + i.quantity, 0)})</dt>
                  <dd className="font-semibold text-gray-900">{brl(subtotal)}</dd>
                </div>
                
                <div className="flex justify-between items-center text-gray-600">
                  <dt className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-[#00a650]" /> Frete
                  </dt>
                  <dd>
                    {finalShipping === 0 ? (
                      <span className="font-bold text-[#00a650]">GRÁTIS</span>
                    ) : (
                      brl(finalShipping)
                    )}
                  </dd>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center rounded-md bg-green-50 p-2 text-xs text-[#00a650] font-semibold">
                    <dt>Cupom: {appliedCoupon}</dt>
                    <dd>{appliedCoupon === "HS10" ? `-${brl(discountAmount)}` : "Frete Grátis"}</dd>
                  </div>
                )}

                <div className="flex justify-between border-t pt-3 text-base sm:text-lg font-bold text-gray-900">
                  <dt>Total a pagar</dt>
                  <dd className="text-[#3483fa]">{brl(total)}</dd>
                </div>
                <p className="text-[11px] text-[#00a650] font-medium text-right">
                  em até 10x sem juros no cartão
                </p>
              </dl>

              {/* DADOS DE ENTREGA */}
              <div className="mt-5 space-y-3 border-t pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Dados para envio rápido</p>
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Nome completo *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder="Seu nome"
                    className="h-8 text-xs bg-gray-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">WhatsApp / Telefone *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    placeholder="(92) 99999-0000"
                    className="h-8 text-xs bg-gray-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-xs">Endereço com número e bairro *</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={200}
                    placeholder="Rua, número, complemento, bairro"
                    className="h-8 text-xs bg-gray-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="city" className="text-xs">Cidade / Estado *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    placeholder="Ex: Manaus/AM"
                    className="h-8 text-xs bg-gray-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="note" className="text-xs">Ponto de referência</Label>
                  <Input
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={200}
                    placeholder="Próximo a..."
                    className="h-8 text-xs bg-gray-50"
                  />
                </div>
              </div>

              <Button
                className="mt-5 w-full bg-[#3483fa] hover:bg-[#2968c8] text-white font-bold py-6 text-sm rounded-md shadow-md"
                size="lg"
                onClick={checkout}
                disabled={submitting}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {submitting ? "Processando pedido..." : "Continuar para pagamento seguro"}
              </Button>
              
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-500 text-center">
                <ShieldCheck className="h-4 w-4 text-[#00a650]" />
                <span>Compra 100% Protegida · Devolução Grátis em até 30 dias</span>
              </div>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
