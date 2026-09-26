import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Minus, Plus, Store, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { groupByStore, useCart } from "@/lib/cart";
import { brl } from "@/lib/format";

// Número do WhatsApp da HS Digital (DDD + número, só dígitos, com 55 na frente)
const WHATSAPP_NUMBER = "556993612254";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho · HS Digital" },
      { name: "description", content: "Revise seus itens por loja e finalize o pedido pelo WhatsApp na HS Digital." },
      { property: "og:title", content: "Carrinho · HS Digital" },
      { property: "og:description", content: "Carrinho multi-loja da HS Digital com pedido via WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQuantity, remove, subtotal } = useCart();
  const groups = groupByStore(items);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");

  const shipping = groups.reduce(
    (sum, g) => sum + (g.items.every((i) => i.freeShipping) ? 0 : 19.9),
    0,
  );
  const total = subtotal + shipping;

  const checkoutViaWhatsApp = () => {
    if (!name.trim() || !address.trim() || !city.trim()) {
      toast.error("Preencha nome, endereço e cidade para entrega.");
      return;
    }

    const lines: string[] = [
      "*Novo pedido — HS Digital*",
      "",
      "*Itens:*",
      ...groups.flatMap((g) => [
        `Loja: ${g.storeName}`,
        ...g.items.map(
          (i) => `• ${i.quantity}x ${i.title} — ${brl(i.price * i.quantity)}`,
        ),
      ]),
      "",
      `Subtotal: ${brl(subtotal)}`,
      `Frete: ${shipping === 0 ? "Grátis" : brl(shipping)}`,
      `*Total: ${brl(total)}*`,
      "",
      "*Entrega:*",
      `Nome: ${name.trim()}`,
      phone.trim() ? `Telefone: ${phone.trim()}` : "",
      `Endereço: ${address.trim()} — ${city.trim()}`,
      note.trim() ? `Obs: ${note.trim()}` : "",
      "",
      "Pagamento: Pix (combinar chave e envio).",
    ].filter(Boolean);

    const encodedMessage = encodeURIComponent(lines.join("\n"));
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.location.assign(whatsappUrl);
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
                          {item.freeShipping && (
                            <span className="mt-1 inline-block rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
                              Frete Grátis
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center rounded-lg border border-border">
                            <button
                              className="grid h-8 w-8 place-items-center"
                              onClick={() => setQuantity(item.productId, item.quantity - 1)}
                              aria-label="Diminuir"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button
                              className="grid h-8 w-8 place-items-center"
                              onClick={() => setQuantity(item.productId, item.quantity + 1)}
                              aria-label="Aumentar"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => remove(item.productId)}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <aside className="surface-card h-fit p-4 lg:sticky lg:top-32">
              <h2 className="text-base font-semibold">Resumo do pedido</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Produtos</dt>
                  <dd>{brl(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frete</dt>
                  <dd>{shipping === 0 ? "Grátis" : brl(shipping)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-bold">
                  <dt>Total</dt>
                  <dd className="text-primary">{brl(total)}</dd>
                </div>
              </dl>

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold">Dados de entrega</p>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Seu nome" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="(92) 99999-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Endereço *</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Rua, número, bairro" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Cidade/UF *</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} placeholder="Manaus/AM" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note">Observações</Label>
                  <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Ponto de referência, etc." />
                </div>
              </div>

              <Button className="mt-4 w-full" size="lg" onClick={checkoutViaWhatsApp}>
                <MessageCircle className="mr-2 h-5 w-5" />
                Finalizar pedido via WhatsApp
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                O resumo do pedido abre no WhatsApp e o pagamento é fechado via Pix com a nossa equipe.
              </p>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
