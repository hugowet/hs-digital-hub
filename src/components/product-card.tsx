import { Link, useNavigate } from "@tanstack/react-router";
import { Package, ShoppingCart, Star, Zap } from "lucide-react";
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

// Formatação do parcelamento estilo marketplace
function getInstallmentDetails(price: number): { text: string } {
  if (price < 15) {
    return { text: "À vista no Pix ou Cartão" };
  }
  const maxInstallments = Math.min(12, Math.max(2, Math.floor(price / 15)));
  const installmentValue = price / maxInstallments;
  return {
    text: `${maxInstallments}x ${brl(installmentValue)} sem juros`,
  };
}

// Separa inteiros e centavos para renderizar centavos sobrescritos como no Mercado Livre
function formatSplitPrice(price: number) {
  const parts = Number(price || 0).toFixed(2).split(".");
  return {
    reais: Number(parts[0]).toLocaleString("pt-BR"),
    centavos: parts[1] || "00",
  };
}

function cleanTitle(title: string): string {
  return title
    .replace(/\bShort shank straight rod\b/gi, "Haste Reta Curta de Precisão")
    .replace(/\bWireless Bluetooth Earphones\b/gi, "Fone de Ouvido Bluetooth Sem Fio")
    .replace(/\bCar Luminous Valve Cap\b/gi, "Tampa de Válvula Automotiva Luminosa")
    .replace(/\bSmart Watch\b/gi, "Relógio Smartwatch Inteligente");
}

function getConsistentSalesCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return 42 + (Math.abs(hash) % 190);
}

export function ProductCard({
  product,
}: {
  product: Product & { originalPrice?: number | null };
}) {
  const { add } = useCart();
  const navigate = useNavigate();
  const displayTitle = cleanTitle(product.title);

  const isDigital =
    product.product_type === "digital" ||
    product.category?.includes("digital") ||
    product.category?.includes("cursos");

  const price = Number(product.price || 0);

  // Âncora psicológica de preço (se o banco não trouxer compare_at_price, simula 32% OFF)
  const rawOriginal = product.originalPrice ?? product.compare_at_price;
  const originalPrice =
    rawOriginal && Number(rawOriginal) > price
      ? Number(rawOriginal)
      : Math.round((price / 0.68) * 100) / 100;

  const discountPercent = Math.max(
    5,
    Math.round(((originalPrice - price) / originalPrice) * 100)
  );

  const priceParts = formatSplitPrice(price);
  const installment = getInstallmentDetails(price);
  const soldCount =
    product.sold_count && product.sold_count > 0 ? product.sold_count : getConsistentSalesCount(product.id);

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

        {/* Tag Tipo de Produto */}
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
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        {/* Título */}
        <h3 className="line-clamp-2 text-xs md:text-sm font-normal text-foreground leading-snug">
          <Link
            to="/produto/$productId"
            params={{ productId: product.id }}
            className="hover:text-primary"
            title={displayTitle}
          >
            {displayTitle}
          </Link>
        </h3>

        <p className="mt-1 text-[11px] text-muted-foreground">
          {product.stores?.name ?? "HS Digital"}
        </p>

        {/* Bloco de Preços no Estilo Mercado Livre */}
        <div className="mt-auto pt-3">
          {/* Linha 1: [XX% OFF] + Preço Riscado */}
          <div className="flex items-center gap-1.5 leading-none">
            <span className="rounded bg-[#00a650] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {discountPercent}% OFF
            </span>
            <span className="text-xs text-muted-foreground line-through">
              {brl(originalPrice)}
            </span>
          </div>

          {/* Linha 2: Preço em destaque com centavos sobrescritos */}
          <div className="mt-1 flex items-start leading-none text-foreground">
            <span className="text-xl md:text-2xl font-normal tracking-tight">
              R$ {priceParts.reais}
            </span>
            <span className="text-[11px] font-semibold tracking-tight ml-0.5">
              {priceParts.centavos}
            </span>
          </div>

          {/* Linha 3: Parcelamento */}
          <p className="mt-1.5 text-xs text-foreground/80 font-normal leading-tight">
            {installment.text}
          </p>

          {/* Linha 4: Frete Grátis com complemento */}
          {!isDigital && (
            <div className="mt-1 flex items-baseline gap-1 text-xs">
              <span className="font-semibold text-[#00a650]">
                Frete grátis
              </span>
              <span className="text-[11px] text-muted-foreground">
                por ser sua primeira compra
              </span>
            </div>
          )}

          {/* Avaliações e Vendas */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Stars rating={product.rating ?? 4.8} />
              <span>({compact(product.reviews_count ?? 120)})</span>
            </div>
            <span>+{soldCount} vendidos</span>
          </div>

          {/* Botão Adicionar */}
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
                  price: price,
                  imageUrl: product.image_url ?? undefined,
                  maxStock: product.stock ?? 99,
                  freeShipping: true,
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
