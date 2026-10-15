import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Heart,
  MessageSquare,
  Minus,
  Plus,
  QrCode,
  Send,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { fetchProduct, fetchProducts } from "@/lib/catalog.functions";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { trackProductView, markAsPurchasedOrInCart, initAbandonmentWatcher } from "@/lib/abandonment-tracker";

export const Route = createFileRoute("/produto/$productId")({
  loader: async ({ params }) => {
    try {
      const product = await fetchProduct({ data: { productId: params.productId } });
      return { product };
    } catch {
      return { product: null };
    }
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.product;
    const title = p?.title ? `${p.title} · Loja JJ Kuster` : "Produto · HS Digital Marketplace";
    const desc =
      p?.description ||
      "Confira todos os detalhes deste produto na Loja JJ Kuster com entrega garantida e compra protegida.";
    const imageUrl =
      p?.image_url ||
      "https://hs-digital-marck.lovable.app/__l5e/assets-v1/39fcaa1a-9680-41a5-9293-4e05e8dc7c2b/hs-digital-logo.png";
    const pageUrl = `https://hs-digital-marck.lovable.app/produto/${params.productId}`;

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:site_name", content: "HS Digital · Loja JJ Kuster" },
        { property: "og:title", title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: pageUrl },
        { property: "og:image", content: imageUrl },
        { property: "og:image:secure_url", content: imageUrl },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "800" },
        { property: "og:image:height", content: "800" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: imageUrl },
      ],
    };
  },
  component: ProductDetailPage,
});

interface QuestionItem {
  id: string;
  question: string;
  answer?: string;
  created_at: string;
}

interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  packagingNote?: string;
  helpfulCount: number;
  verified: boolean;
}

function getConsistentSalesCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return 38 + (Math.abs(hash) % 184);
}

function formatSplitPrice(price: number) {
  const parts = Number(price || 0).toFixed(2).split(".");
  return {
    reais: Number(parts[0]).toLocaleString("pt-BR"),
    centavos: parts[1] || "00",
  };
}

export function ProductDetailPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct({ data: { productId } }),
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.category],
    enabled: !!product?.category,
    queryFn: async () => {
      try {
        const res = await fetchProducts({ data: { category: product?.category, limit: 12 } });
        return (res ?? []).filter((p: Product) => p.id !== productId);
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    initAbandonmentWatcher();
    if (product) {
      trackProductView({
        id: product.id,
        title: product.title,
        price: Number(product.price),
        imageUrl: product.image_url ?? undefined,
      });
    }
  }, [product]);

  const maxAvailableStock = useMemo(() => {
    const rawStock = Number(product?.stock);
    return Number.isFinite(rawStock) && rawStock > 0 ? rawStock : 99;
  }, [product?.stock]);

  const price = Number(product?.price || 0);
  const rawOriginal = product?.compare_at_price;
  const originalPrice =
    rawOriginal && Number(rawOriginal) > price
      ? Number(rawOriginal)
      : Math.round((price / 0.68) * 100) / 100;

  const discountPercent = Math.max(5, Math.round(((originalPrice - price) / originalPrice) * 100));
  const priceParts = formatSplitPrice(price);
  const maxInstallments = Math.min(10, Math.max(2, Math.floor(price / 15)));
  const installmentValue = price / maxInstallments;

  const isDigital = useMemo(() => {
    if (!product) return false;
    return (
      product.product_type === "digital" ||
      product.category?.includes("digital") ||
      product.category?.includes("cursos")
    );
  }, [product]);

  const salesCount = useMemo(() => {
    if (!product) return 120;
    return product.sold_count && product.sold_count > 0
      ? product.sold_count
      : getConsistentSalesCount(product.id);
  }, [product]);

  const imagesList = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    if (product.image_url) list.push(product.image_url);
    if (Array.isArray(product.gallery_urls)) {
      product.gallery_urls.forEach((url) => {
        if (url && !list.includes(url)) list.push(url);
      });
    }
    return list.length > 0 ? list : ["https://placehold.co/600x600/f3f4f6/666666?text=Sem+Foto"];
  }, [product]);

  const updateCarouselArrows = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  const scrollCarousel = (dir: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const handleAddToCart = (redirectCheckout: boolean) => {
    if (!product) return;
    markAsPurchasedOrInCart(product.id);

    add(
      {
        productId: product.id,
        title: product.title,
        price: Number(product.price),
        imageUrl: product.image_url ?? null,
        stock: maxAvailableStock,
        freeShipping: true,
        storeId: product.store_id ?? "jj-kuster",
        storeName: (product as any).stores?.name ?? "Loja JJ Kuster",
        productType: (product.product_type as any) ?? "physical",
      },
      quantity
    );

    if (redirectCheckout) {
      navigate({ to: "/carrinho" });
    } else {
      toast.success(`${quantity}x ${product.title} adicionado ao carrinho!`);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link do produto copiado!");
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setQuestions((prev) => [
      { id: `q_${Date.now()}`, question: newQuestion.trim(), created_at: "agora mesmo" },
      ...prev,
    ]);
    setNewQuestion("");
    toast.success("Pergunta enviada com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-2xl bg-muted/40" />
            <div className="space-y-4">
              <div className="h-6 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="h-8 w-1/3 animate-pulse rounded bg-muted/40" />
              <div className="h-32 animate-pulse rounded-xl bg-muted/40" />
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-16 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Produto não encontrado</h1>
          <Button asChild className="mt-6">
            <Link to="/">Voltar para o início</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span>/</span>
          <span className="capitalize">{product.category || "Produtos"}</span>
          <span>/</span>
          <span className="line-clamp-1 text-foreground font-medium">{product.title}</span>
        </div>

        {/* Card Principal */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Galeria de Fotos */}
            <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-3">
              {imagesList.length > 1 && (
                <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto max-h-[480px] shrink-0">
                  {imagesList.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        selectedImage === idx ? "border-primary" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="relative aspect-square w-full flex-1 overflow-hidden rounded-xl border border-border bg-muted/20">
                <img
                  src={imagesList[selectedImage] || imagesList[0]}
                  alt={product.title}
                  className="h-full w-full object-contain p-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsFavorite(!isFavorite);
                    toast.success(!isFavorite ? "Salvo nos seus favoritos!" : "Removido dos favoritos.");
                  }}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-sm"
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
                </button>
              </div>
            </div>

            {/* Painel Lateral de Preços e Compra */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Novo</span>
                  <span>•</span>
                  <span>+{salesCount} vendidos</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    ★ {Number(product.rating ?? 4.9).toFixed(1)}
                  </span>
                </div>

                <h1 className="mt-2 text-base sm:text-xl font-bold leading-snug text-foreground">
                  {product.title}
                </h1>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Vendido e entregue por</span>
                  <span className="font-bold text-primary flex items-center gap-1">
                    Loja JJ Kuster <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  </span>
                </div>

                {/* BLOCO DE PREÇO OFICIAL */}
                <div className="mt-4 rounded-xl bg-muted/20 p-4 border border-border/80">
                  <div className="flex items-center gap-2 leading-none">
                    <span className="rounded bg-[#00a650] px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {discountPercent}% OFF
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      {brl(originalPrice)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-start leading-none text-foreground">
                    <span className="text-3xl sm:text-4xl font-normal tracking-tight">
                      R$ {priceParts.reais}
                    </span>
                    <sup className="text-sm sm:text-base font-semibold tracking-tight ml-0.5 top-0.5">
                      {priceParts.centavos}
                    </sup>
                  </div>

                  <p className="mt-2 text-xs text-foreground/80 font-normal">
                    em até <span className="font-semibold">{maxInstallments}x de {brl(installmentValue)}</span> sem juros
                  </p>

                  {!isDigital && (
                    <div className="mt-1.5 flex items-baseline gap-1 text-xs">
                      <span className="font-bold text-[#00a650]">Frete grátis</span>
                      <span className="text-[11px] text-muted-foreground">por ser sua primeira compra</span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      Pague com Pix ou Cartão via Mercado Pago:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border/70 bg-card p-2 text-center">
                        <QrCode className="h-4 w-4 mx-auto text-emerald-600 mb-0.5" />
                        <p className="text-[11px] font-bold">Pix</p>
                        <p className="text-[9px] text-muted-foreground">Aprovação imediata</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-card p-2 text-center">
                        <CreditCard className="h-4 w-4 mx-auto text-primary mb-0.5" />
                        <p className="text-[11px] font-bold">Cartão</p>
                        <p className="text-[9px] text-muted-foreground">Até 10x sem juros</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="mt-3 w-full border-border text-foreground hover:bg-muted font-semibold text-xs h-9"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> Compartilhar produto
                </Button>

                {/* Garantias */}
                <div className="mt-3 space-y-2 rounded-xl bg-muted/30 p-3 border border-border/60 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Compra 100% Protegida com garantia oficial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary shrink-0" />
                    <span>Envio com código de rastreamento direto no e-mail</span>
                  </div>
                </div>

                {/* Seleção de Quantidades */}
                <div className="mt-4 flex items-center justify-between border-y border-border py-2.5">
                  <span className="text-xs font-semibold text-foreground">Quantidade:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxAvailableStock, q + 1))}
                      disabled={quantity >= maxAvailableStock}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({maxAvailableStock} disponíveis)
                    </span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="mt-4 space-y-2">
                  <Button
                    type="button"
                    onClick={() => handleAddToCart(false)}
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/10 font-bold h-11 text-sm transition"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" /> Adicionar ao Carrinho
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleAddToCart(true)}
                    className="w-full bg-[#00a650] hover:bg-[#008f45] text-white font-black h-12 text-base shadow-md transition"
                  >
                    <Zap className="h-4 w-4 mr-1.5 fill-current" /> Comprar Agora
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARROSSEL DE PRODUTOS SEMELHANTES COM SETAS LATERAIS */}
        {relatedProducts.length > 0 && (
          <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Quem viu este produto também comprou</h2>
                <p className="text-xs text-muted-foreground">Itens semelhantes na categoria {product.category}</p>
              </div>

              {/* Setas de navegação */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-border bg-background shadow-sm hover:bg-muted disabled:opacity-30"
                  onClick={() => scrollCarousel("left")}
                  disabled={!canScrollLeft}
                  aria-label="Voltar carrossel"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-border bg-background shadow-sm hover:bg-muted disabled:opacity-30"
                  onClick={() => scrollCarousel("right")}
                  disabled={!canScrollRight}
                  aria-label="Avançar carrossel"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              ref={carouselRef}
              onScroll={updateCarouselArrows}
              className="flex gap-4 overflow-x-auto scroll-smooth pb-2 pt-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]"
            >
              {relatedProducts.map((relProduct: Product) => (
                <div key={relProduct.id} className="w-[190px] sm:w-[220px] shrink-0">
                  <ProductCard product={relProduct} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Descrição */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm">
          <h2 className="text-lg sm:text-xl font-black text-foreground pb-3 border-b border-border flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Descrição do Produto
          </h2>
          <div className="mt-4 space-y-4 text-sm text-foreground/90 leading-relaxed">
            <div>
              <h3 className="font-bold text-base text-foreground">{product.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Produto novo, lacrado e com envio imediato e compra garantida.
              </p>
            </div>
            <div className="border-t border-border/60 pt-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Detalhes & Especificações
              </h4>
              <p className="whitespace-pre-line text-xs sm:text-sm text-foreground/80">
                {product.description_long || product.description || "Descrição completa em processamento."}
              </p>
            </div>
          </div>
        </section>

        {/* Perguntas */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm">
          <h2 className="text-lg sm:text-xl font-black text-foreground pb-3 border-b border-border flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Perguntas e Respostas
          </h2>
          <form onSubmit={handleAddQuestion} className="mt-4 flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Escreva sua pergunta para a Loja JJ Kuster..."
              className="flex-1"
            />
            <Button type="submit" className="shrink-0 font-bold">
              <Send className="h-4 w-4 mr-1.5" /> Perguntar
            </Button>
          </form>
          <div className="mt-6 space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
                <p className="font-semibold text-foreground">"{q.question}"</p>
                <p className="text-[10px] text-muted-foreground mt-1">{q.created_at}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
