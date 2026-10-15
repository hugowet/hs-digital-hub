import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

// Adicione dentro do componente Home:
const categoryScrollRef = useRef<HTMLDivElement>(null);
const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
const [canScrollCatRight, setCanScrollCatRight] = useState(true);

const handleCategoryScroll = () => {
  const el = categoryScrollRef.current;
  if (!el) return;
  setCanScrollCatLeft(el.scrollLeft > 10);
  setCanScrollCatRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
};

const scrollCategories = (direction: "left" | "right") => {
  const el = categoryScrollRef.current;
  if (!el) return;
  const amount = el.clientWidth * 0.6;
  el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
};

// No JSX da barra de categorias, envolva com a estrutura:
<div className="relative flex items-center">
  {canScrollCatLeft && (
    <button
      type="button"
      onClick={() => scrollCategories("left")}
      className="absolute -left-3 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-muted"
      aria-label="Rolar categorias para esquerda"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  )}

  <div
    ref={categoryScrollRef}
    onScroll={handleCategoryScroll}
    className="flex gap-2 overflow-x-auto scroll-smooth py-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]"
  >
    {/* Seus botões de categorias aqui dentro */}
  </div>

  {canScrollCatRight && (
    <button
      type="button"
      onClick={() => scrollCategories("right")}
      className="absolute -right-3 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-muted"
      aria-label="Rolar categorias para direita"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  )}
</div>
