import { Link } from "@tanstack/react-router";
import { Check, ShoppingCart, Star } from "lucide-react";
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
              ? "h-3.5 w-3.5 fill-[#3483fa] text-[#3483fa]"
              : "h-3.5 w-3.5 text-gray-300"
          }
        />
      ))}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const originalTitle = product.title;

  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : 0;

  const handleAddToCart = () => {
    add(
      {
        productId: product.id,
        title: originalTitle,
        price: Number(product.price),
        imageUrl: product.image_url,
        storeId: product.store_id,
        storeName: product.stores?.name ?? "Loja parceira",
        freeShipping: product.free_shipping,
        productType: product.product_type,
        stock: product.stock,
      },
      1,
    );
    void trackAbandonedCart(product.id, 1);
    
    // Notificação visual temporária que some automaticamente após 2.5 segundos
    toast.success("Produto adicionado ao carrinho!", {
      duration: 2500,
      icon: <Check className="h-4 w-4 text-[#00a650]" />,
    });
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Imagem do Produto */}
      <div className="relative aspect-square max-h-56 w-full overflow-hidden bg-gray-50">
        {product.image_url && (
          <Link to="/produto/$productId" params={{ productId: product.id }} className="block h-full w-full">
            <img
              src={product.image_url}
              alt={originalTitle}
              loading="lazy"
              width={400}
              height={400}
              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-[#00a650] px-2 py-0.5 text-[11px] font-bold text-white">
            -{discount}% OFF
          </span>
        )}
        {product.free_shipping && (
          <span className="absolute bottom-2 left-2 rounded-md bg-[#e6f7ee] text-[#00a650] px-2 py-0.5 text-[10px] font-bold">
            Frete Grátis
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {/* Título Original */}
        <h3 className="line-clamp-2 text-xs md:text-sm font-medium leading-snug text-gray-800">
          <Link to="/produto/$productId" params={{ productId: product.id }} className="hover:text-[#3483fa]" title={originalTitle}>
            {originalTitle}
          </Link>
        </h3>
        
        <p className="text-[11px] text-gray-400">{product.stores?.name ?? "Loja oficial"}</p>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-bold text-gray-900">
              {brl(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs text-gray-400 line-through">
                {brl(product.compare_at_price)}
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#00a650] font-medium">em 10x sem juros</p>

          <div className="mt-2 flex items-center justify-between gap-1 text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <Stars rating={product.rating ?? 4.8} />
              <span>({compact(product.reviews_count ?? 120)})</span>
            </div>
            <span>{compact(product.sold_count ?? 45)} vendidos</span>
          </div>

          <Button
            size="sm"
            onClick={handleAddToCart}
            className="mt-3 w-full gap-1.5 bg-[#3483fa] hover:bg-[#2968c8] text-white text-xs font-semibold py-1.5 transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}
