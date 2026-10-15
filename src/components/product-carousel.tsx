import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  actionLabel?: string;
  onActionClick?: () => void;
}

export function ProductCarousel({
  title,
  subtitle,
  products,
  actionLabel,
  onActionClick,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Monitora a rolagem para habilitar/desabilitar as setas dinamicamente
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, products]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="relative my-8 w-full max-w-7xl mx-auto px-4">
      {/* Cabeçalho do Carrossel */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {subtitle}
            </span>
          )}
        </div>
        {actionLabel && (
          <button
            type="button"
            onClick={onActionClick}
            className="text-xs md:text-sm font-semibold text-primary hover:underline transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>

      {/* Container com Botões de Navegação Flutuantes */}
      <div className="relative group">
        {/* Seta Esquerda */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Rolar para a esquerda"
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl border border-gray-100 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
          </button>
        )}

        {/* Linha Rolável de Cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 px-1 no-scrollbar select-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {products.map((item) => (
            <div
              key={item.id}
              className="w-[200px] sm:w-[220px] md:w-[240px] shrink-0 transition-transform duration-200"
            >
              <ProductCard product={item} />
            </div>
          ))}
        </div>

        {/* Seta Direita */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Rolar para a direita"
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl border border-gray-100 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
          >
            <ChevronRight className="h-6 w-6 stroke-[2.5]" />
          </button>
        )}
      </div>
    </section>
  );
}
