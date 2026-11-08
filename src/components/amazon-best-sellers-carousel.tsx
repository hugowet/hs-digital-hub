import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { TrendingUp } from "lucide-react";
import { amazonBestSellersOptions } from "@/lib/amazon-best-sellers";
import { brl } from "@/lib/format";
import { createCarouselAutoplay } from "@/lib/carousel-autoplay";

export function AmazonBestSellersCarousel({ title = "Mais vendidos", options = amazonBestSellersOptions as any, showFeatured = true }: { title?: string; options?: any; showFeatured?: boolean } = {}) {
  // An optional carousel must never replace the entire storefront on a network failure.
  const { data: products = [] } = useQuery<any[]>({ ...options, throwOnError: false });
  const [trackRef, carousel] = useEmblaCarousel({ align: "start", loop: true });
  const [reducedMotion, setReducedMotion] = useState(false);
  const interacting = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!carousel || reducedMotion || products.length < 2) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    let visible = false;
    const timer = createCarouselAutoplay(() => {
      if (interacting.current) return;
      if (carousel.canScrollNext()) carousel.scrollNext();
      else carousel.scrollTo(0);
    });
    const update = () => timer.setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.25);
      update();
    }, { threshold: 0.25 });
    observer.observe(viewport);
    document.addEventListener("visibilitychange", update);
    return () => {
      timer.dispose();
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [carousel, reducedMotion, products.length]);

  if (!products.length) return null;

  return (
    <section aria-label={title} className="mb-7">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" /> {title}
        </h2>
      </div>
      <div ref={(node) => { viewportRef.current = node; trackRef(node); }} className="overflow-hidden" onPointerEnter={() => { interacting.current = true; }} onPointerLeave={() => { interacting.current = false; }} onFocusCapture={() => { interacting.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) interacting.current = false; }}>
        <div className="-ml-3 flex touch-pan-y">
          {products.map((product, index) => (
            <div key={product.id} data-carousel-product-id={product.id} className="min-w-0 shrink-0 grow-0 basis-1/2 pl-3 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
              <Link to="/produto/$productId" params={{ productId: product.id }} className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
                <div className="relative aspect-square bg-muted/20">
                  {product.image_url && <img src={product.image_url} alt={product.title} width={400} height={400} loading="lazy" className="h-full w-full object-contain p-3" />}
                  {showFeatured && index === 0 && <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">Em destaque</span>}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 min-h-10 text-sm leading-5">{product.title}</p>
                  {Number(product.sold_count) > 0 && <p className="mt-1 text-xs text-muted-foreground">{product.sold_count} vendido{Number(product.sold_count) === 1 ? "" : "s"}</p>}
                  {(() => {
                    const price = Number(product.price);
                    const old = Number(product.compare_at_price);
                    const off = old > price && price > 0 ? Math.round((1 - price / old) * 100) : 0;
                    return (
                      <div className="mt-auto pt-2">
                        {off > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground line-through">{brl(old)}</span>
                            <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">{off}% OFF</span>
                          </div>
                        )}
                        <p className="text-lg font-bold text-foreground">{brl(price)}</p>
                      </div>
                    );
                  })()}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}