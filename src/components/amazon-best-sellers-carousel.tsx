import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Pause, Play, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { amazonBestSellersOptions } from "@/lib/amazon-best-sellers";
import { brl } from "@/lib/format";
import { createCarouselAutoplay } from "@/lib/carousel-autoplay";

export function AmazonBestSellersCarousel() {
  // An optional carousel must never replace the entire storefront on a network failure.
  const { data: products = [] } = useQuery({ ...amazonBestSellersOptions, throwOnError: false });
  const [trackRef, carousel] = useEmblaCarousel({ align: "start", loop: true });
  const [paused, setPaused] = useState(false);
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
    if (!carousel || paused || reducedMotion || products.length < 2) return;
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
  }, [carousel, paused, reducedMotion, products.length]);

  if (!products.length) return null;

  return (
    <section aria-label="Mais vendidos" className="mb-7">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" /> Mais vendidos
        </h2>
        <div className="flex shrink-0 gap-1">
          {!reducedMotion && <Button size="icon" variant="ghost" aria-label={paused ? "Continuar carrossel" : "Pausar carrossel"} title={paused ? "Continuar" : "Pausar"} onClick={() => setPaused((value) => !value)}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>}
          <Button size="icon" variant="outline" aria-label="Mais vendidos anteriores" title="Anteriores" onClick={() => carousel?.scrollPrev()}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" aria-label="Próximos mais vendidos" title="Próximos" onClick={() => carousel?.scrollNext()}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div ref={(node) => { viewportRef.current = node; trackRef(node); }} className="overflow-hidden" onPointerEnter={() => { interacting.current = true; }} onPointerLeave={() => { interacting.current = false; }} onFocusCapture={() => { interacting.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) interacting.current = false; }}>
        <div className="-ml-3 flex touch-pan-y">
          {products.map((product, index) => (
            <div key={product.id} data-carousel-product-id={product.id} className="min-w-0 shrink-0 grow-0 basis-1/2 pl-3 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
              <Link to="/produto/$productId" params={{ productId: product.id }} className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
                <div className="relative aspect-square bg-muted/20">
                  {product.image_url && <img src={product.image_url} alt={product.title} width={400} height={400} loading="lazy" className="h-full w-full object-contain p-3" />}
                  {index === 0 && <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">Em destaque</span>}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 min-h-10 text-sm leading-5">{product.title}</p>
                  {Number(product.sold_count) > 0 && <p className="mt-1 text-xs text-muted-foreground">{product.sold_count} vendido{Number(product.sold_count) === 1 ? "" : "s"}</p>}
                  <p className="mt-auto pt-2 text-lg font-bold text-foreground">{brl(Number(product.price))}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}