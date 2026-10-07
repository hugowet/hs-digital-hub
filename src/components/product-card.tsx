import { Link, useNavigate } from "@tanstack/react-router";
import { Package, ShoppingCart, Sparkles, Star, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { brl, compact } from "@/lib/format";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating) ? "h-3.5 w-3.5 fill-[#3483fa] text-[#3483fa]" : "h-3.5 w-3.5 text-gray-300"
          }
        />
      ))}
    </span>
  );
}

// Calcula parcelamento realista: parcela mínima de R$ 5,00
function getInstallmentText(price: number): string {
  if (price < 10) {
    return "À vista no Pix ou Cartão";
  }
  const maxInstallments = Math.min(10, Math.floor(price / 5));
  if (maxInstallments <= 1) {
    return "À vista no Pix ou Cartão";
  }
  const value = price / maxInstallments;
  return `em até ${maxInstallments}x de ${brl(value)} sem juros`;
}

// Tradução rápida de termos frequentes de importação caso não tratados
function cleanTitle(title: string): string {
  return title
    .replace(/\bShort shank straight rod\b/gi, "Haste Reta Curta de Precisão")
    .replace(/\bWireless Bluetooth Earphones\b/gi, "Fone de Ouvido Bluetooth Sem Fio")
    .replace(/\bCar Luminous Valve Cap\b/gi, "Tampa de Válvula Automotiva Luminosa")
    .replace(/\bSmart Watch\b/gi, "Relógio Smartwatch Inteligente");
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const navigate = useNavigate();
  const displayTitle = cleanTitle(product.title);

  const isDigital =
    product.product_type === "digital" || product.category?.includes("digital") || product.category?.includes("cursos");

  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {/* Imagem do Produto */}
      <div className="relative aspect-square max-h-56 w-full overflow-hidden bg-muted/20">
        {product.image_url ? (
          <Link to="/produto/$productId" params={{ productId: product.id }} className="block h-full w-full">
            <img
              src={product.image_url}
              alt={displayTitle}
              loading="lazy"
              width={400}
              height={400}
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
          </div>
        )}

        {/* Badge Digital vs Físico */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {isDigital ? (
            <span className="flex items-center gap-1 rounded-md bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Zap className="h-3 w-3" /> Digital
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Package className="h-3 w-3" /> Físico
            </span>
          )}

          {discount > 0 && (
            <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{discount}% OFF
            </span>
          )}
        </div>

        {product.free_shipping && !isDigital && (
          <span className="absolute bottom-2 left-2 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold shadow-sm">
            Frete Grátis
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {/* Título */}
        <h3 className="line-clamp-2 text-xs md:text-sm font-semibold leading-snug text-foreground">
          <Link
            to="/produto/$productId"
            params={{ productId: product.id }}
            className="hover:text-primary"
            title={displayTitle}
          >
            {displayTitle}
          </Link>
        </h3>

        <p className="text-[11px] text-muted-foreground">{product.stores?.name ?? "HS Digital"}</p>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-black text-foreground">{brl(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs text-muted-foreground line-through">{brl(product.compare_at_price)}</span>
            )}
          </div>

          {/* Regra de parcelamento inteligente */}
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {getInstallmentText(product.price)}
          </p>

          <div className="mt-2 flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Stars rating={product.rating ?? 4.8} />
              <span>({compact(product.reviews_count ?? 120)})</span>
            </div>
            <span>{compact(product.sold_count ?? 45)} vendidos</span>
          </div>

          <Button
            size="sm"
            className="mt-3 w-full font-bold"
            onClick={async () => {
              const { data, error } = await supabase.auth.getUser();
              if (error || !data.user) {
                toast.info("Faça login para adicionar produtos ao carrinho.");
                navigate({ to: "/auth", search: { reason: "login-required" } });
                return;
              }
              add(
                {
                  productId: product.id,
                  title: displayTitle,
                  price: Number(product.price),
                  imageUrl: product.image_url ?? null,
                  maxStock: product.stock ?? 99,
                  freeShipping: product.free_shipping,
                  storeId: product.store_id,
                  storeName: product.stores?.name ?? "HS Digital",
                  productType: (product.product_type as "physical" | "digital") ?? "physical",
                },
                1,
              );
              toast.success("Adicionado ao carrinho!");
            }}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}
