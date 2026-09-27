import { Link } from "@tanstack/react-router";
import { ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { trackAbandonedCart } from "@/lib/abandoned-cart";
import { brl, compact } from "@/lib/format";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating)
              ? "h-3.5 w-3.5 fill-primary text-primary"
              : "h-3.5 w-3.5 text-muted-foreground/40"
          }
        />
      ))}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : 0;

  return (
    <article className="group surface-card flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url && (
          <Link to="/produto/$productId" params={{ productId: product.id }}>
            <img
              src={product.image_url}
              alt={product.title}
              loading="lazy"
              width={640}
              height={640}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground">
            -{discount}%
          </span>
        )}
        {product.free_shipping && (
          <span className="absolute bottom-2 left-2 rounded-md bg-success px-2 py-1 text-[11px] font-semibold text-success-foreground">
            Frete Grátis
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          <Link to="/produto/$productId" params={{ productId: product.id }} className="hover:text-primary">
            {product.title}
          </Link>
        </h3>
        <p className="text-xs text-muted-foreground">{product.stores?.name ?? "Loja parceira"}</p>

        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold text-primary">
              {brl(Number(product.price))}
            </span>
            {discount > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {brl(Number(product.compare_at_price))}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Stars rating={Number(product.rating)} />
            <span>{Number(product.rating).toFixed(1)}</span>
            <span>· {compact(product.sold_count)} vendidos</span>
          </div>

          <Button
            onClick={() => {
              add({
                productId: product.id,
                title: product.title,
                price: Number(product.price),
                imageUrl: product.image_url,
                storeId: product.store_id,
                storeName: product.stores?.name ?? "Loja parceira",
                freeShipping: product.free_shipping,
                stock: product.stock,
              });
              void trackAbandonedCart(product.id, 1);
              toast.success("Adicionado ao carrinho");
            }}
            disabled={product.stock <= 0}
            className="mt-3 w-full primary-gradient"
          >
            <ShoppingCart className="h-4 w-4" /> {product.stock > 0 ? "Adicionar ao Carrinho" : "Sem estoque"}
          </Button>
        </div>
      </div>
    </article>
  );
}
