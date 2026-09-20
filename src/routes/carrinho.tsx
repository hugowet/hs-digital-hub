import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { fetchCommissionRate } from "@/lib/catalog";
import { groupByStore, useCart } from "@/lib/cart";
import { brl, splitPayment } from "@/lib/format";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho · HS Digital" },
      { name: "description", content: "Revise seus itens por loja e finalize a compra na HS Digital." },
      { property: "og:title", content: "Carrinho · HS Digital" },
      { property: "og:description", content: "Carrinho multi-loja da HS Digital com checkout seguro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQuantity, remove, subtotal, clear } = useCart();
  const groups = groupByStore(items);
  const { data: commissionRate = 0.12 } = useQuery({
    queryKey: ["commission-rate"],
    queryFn: fetchCommissionRate,
  });

  const shipping = groups.reduce(
    (sum, g) => sum + (g.items.every((i) => i.freeShipping) ? 0 : 19.9),
    0,
  );
  const total = subtotal + shipping;
  const split = splitPayment(total, commissionRate);

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
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
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

              <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Split de pagamento</p>
                <p className="mt-1 flex justify-between">
                  <span>Comissão HS Digital ({(commissionRate * 100).toFixed(1)}%)</span>
                  <span>{brl(split.platformFee)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Repasse aos vendedores</span>
                  <span>{brl(split.sellerAmount)}</span>
                </p>
              </div>

              <Button
                className="mt-4 w-full"
                size="lg"
                onClick={() => {
                  toast.success("Pedido pronto para pagamento", {
                    description: "Integração de split com Mercado Pago/Asaas entra nesta etapa.",
                  });
                  clear();
                }}
              >
                Finalizar compra
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Pix, cartão e boleto · pagamento processado com split automático
              </p>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
