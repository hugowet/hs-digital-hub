import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/catalog";
import { fetchCatalogPage } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/product-card";
import { mixByOrigin } from "@/lib/origin-mix";

function CategoryRow({ slug, label }: { slug: string; label: string }) {
  const { data = [] } = useQuery({
    queryKey: ["category-row", slug],
    staleTime: 5 * 60_000,
    throwOnError: false,
    queryFn: async () => {
      try {
        const [amazon, cj] = await Promise.all([
          slug === "estampas" ? fetchCatalogPage({ data: { category: slug, supplier: null, pageSize: 15 } }).catch(() => ({ products: [] })) : fetchCatalogPage({ data: { category: slug, supplier: "amazon", pageSize: 12 } }).catch(() => ({ products: [] })),
          fetchCatalogPage({ data: { category: slug, supplier: "cj", pageSize: 3 } }).catch(() => ({ products: [] })),
        ]);
        return mixByOrigin([...amazon.products, ...cj.products]).slice(0, 15);
      } catch {
        return [];
      }
    },
  });
  const rowRef = useRef<HTMLDivElement>(null);
  if (data.length === 0) return null;
  const scrollBy = (dir: number) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const arrow = "absolute top-1/2 z-10 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-md hover:bg-card";
  return (
    <section className="mb-6" aria-label={label}>
      <h2 className="mb-2 text-base font-bold text-foreground">{label}</h2>
      <div className="relative">
      <button type="button" aria-label={`Voltar em ${label}`} onClick={() => scrollBy(-1)} className={`${arrow} left-1`}><ChevronLeft className="h-5 w-5" /></button>
      <button type="button" aria-label={`Avançar em ${label}`} onClick={() => scrollBy(1)} className={`${arrow} right-1`}><ChevronRight className="h-5 w-5" /></button>
      <div ref={rowRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {data.map((p) => (
          <div key={p.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[18%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}

/** Uma fileira por categoria, arrastável, sem passagem automática. */
export function CategoryCarousels() {
  return (
    <div>
      {CATEGORIES.map((c) => (
        <CategoryRow key={c.slug} slug={c.slug} label={c.label} />
      ))}
    </div>
  );
}
