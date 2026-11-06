import { useQuery } from "@tanstack/react-query";
import { CATEGORIES } from "@/lib/catalog";
import { fetchCatalogPage } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/product-card";

function CategoryRow({ slug, label }: { slug: string; label: string }) {
  const { data = [] } = useQuery({
    queryKey: ["category-row", slug],
    staleTime: 5 * 60_000,
    throwOnError: false,
    queryFn: async () => {
      try {
        const res = await fetchCatalogPage({ data: { category: slug, pageSize: 12 } });
        return res.products;
      } catch {
        return [];
      }
    },
  });
  if (data.length === 0) return null;
  return (
    <section className="mb-6" aria-label={label}>
      <h2 className="mb-2 text-base font-bold text-foreground">{label}</h2>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {data.map((p) => (
          <div key={p.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[18%]">
            <ProductCard product={p} />
          </div>
        ))}
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
