import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  Box,
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
  ThumbsUp,
  Truck,
  X,
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
import { brl, compact } from "@/lib/format";
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
        { property: "og:title", content: title },
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
  const positive = Math.abs(hash);
  return 38 + (positive % 184);
}

// Separa inteiros e centavos para renderizar com estilo Mercado Livre (<sup>)
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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct({ data: { productId } }),
  });

  // Rastreamento para a notificação de 30 minutos
  useEffect(() => {
    if (product) {
      trackProductView({
        id: product.id,
        title: product.title,
        price: product.price,
        image_url: product.image_url,
      });
    }
  }, [product]);

  useEffect(() => {
    const cleanup = initAbandonmentWatcher();
    return () => {
      cleanup?.();
    };
  }, []);

  // Catálogo para alimentar os produtos semelhantes
  const { data: allCatalog = [] } = useQuery({
    queryKey: ["similar-products", product?.category],
    queryFn: () => fetchProducts(),
    staleTime: 1000 * 60 * 10,
  });

  const similarProducts = useMemo(() => {
    if (!product || !allCatalog) return [];
    return allCatalog
      .filter((p) => p.id !== product.id)
      .sort((a, b) => {
        const aCat = a.category === product.category ? 1 : 0;
        const bCat = b.category === product.category ? 1 : 0;
        return bCat - aCat;
      })
      .slice(0, 15);
  }, [product, allCatalog]);

  const media = useMemo(() => {
    if (!product) return [];
    if (product.media?.length) return product.media;
    const list: Array<{ id: string; url: string; media_type: "image" }> = [];
    if (product.image_url) {
      list.push({ id: "main", url: product.image_url, media_type: "image" });
    }
    (product.gallery_urls ?? []).forEach((u, i) => {
      if (u && u !== product.image_url) {
        list.push({ id: `gal-${i}`, url: u, media_type: "image" });
      }
    });
    return list;
  }, [product]);

  const currentMedia = media[selectedImage] || media[0];

  // Perguntas do produto
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    try {
      const saved = localStorage.getItem(`questions_${productId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "q_1",
        question: "O produto vem com nota fiscal e garantia de fábrica?",
        answer: "Olá! Sim, todos os produtos acompanham garantia oficial e nota de envio.",
        created_at: "há 1 dia",
      },
      {
        id: "q_2",
        question: "Qual o prazo de envio após a confirmação do pagamento?",
        answer: "O envio é realizado no mesmo dia para pagamentos confirmados até as 14h.",
        created_at: "há 2 dias",
      },
    ];
  });

  const [newQuestion, setNewQuestion] = useState("");

  // Avaliações
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(`reviews_${productId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReviews(parsed);
          return;
        }
      }

      if (product) {
        const initialReviews: ReviewItem[] = [
          {
            id: `rev_1_${productId}`,
            author: "Marcos S.",
            rating: 5,
            date: "Brasil · Há 4 dias",
            comment:
              "Chegou muito rápido! A caixa veio intacta e o produto lacrado de fábrica. Abri e testei na hora, qualidade surreal pelo preço.",
            packagingNote: "Embalagem: Excelente, lacrado no plástico bolha e caixa reforçada.",
            verified: true,
            helpfulCount: 16,
          },
          {
            id: `rev_2_${productId}`,
            author: "Juliana Mendes",
            rating: 5,
            date: "Brasil · Há 1 semana",
            comment:
              "A entrega da Loja JJ Kuster foi rápida demais. Produto idêntico ao anúncio, recomendo muito!",
            packagingNote: "Entrega: Rápida e pacote muito bem protegido.",
            verified: true,
            helpfulCount: 9,
          },
          {
            id: `rev_3_${productId}`,
            author: "Rodrigo Almeida",
            rating: 5,
            date: "Brasil · Há 2 semanas",
            comment:
              "Excelente custo-benefício. O entregador foi muito atencioso e o pacote veio 100% lacrado. Já estou usando no dia a dia.",
            verified: true,
            helpfulCount: 5,
          },
        ];
        setReviews(initialReviews);
        localStorage.setItem(`reviews_${productId}`, JSON.stringify(initialReviews));
      }
    } catch (e) {
      console.error("Erro ao sincronizar avaliações:", e);
    }
  }, [productId, product]);

  const salesCount = useMemo(() => {
    if (!product) return 120;
    return product.sold_count && product.sold_count > 0
      ? product.sold_count
      : getConsistentSalesCount(product.id);
  }, [product]);

  const totalReviewsCount = useMemo(() => {
    if (!product) return 42;
    return (product.reviews_count ?? 40) + reviews.length - 3;
  }, [product, reviews.length]);

  const averageRating = useMemo(() => {
    if (!product) return 4.9;
    return Number(product.rating ?? 4.9);
  }, [product]);

  const isDigital = useMemo(() => {
    if (!product) return false;
    return (
      product.product_type === "digital" ||
      product.category?.includes("digital") ||
      product.category?.includes("cursos")
    );
  }, [product]);

  // Âncora de Preço Inteligente Mercado Livre
  const price = Number(product?.price || 0);
  const rawOriginal = product?.compare_at_price;
  const originalPrice =
    rawOriginal && Number(rawOriginal) > price
      ? Number(rawOriginal)
      : Math.round((price / 0.68) * 100) / 100;

  const discountPercent = Math.max(
    5,
    Math.round(((originalPrice - price) / originalPrice) * 100)
  );

  const priceParts = formatSplitPrice(price);
  const maxInstallments = Math.min(10, Math.max(2, Math.floor(price / 15)));
  const installmentValue = price / maxInstallments;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product?.title || "Confira este produto na Loja JJ Kuster",
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const newItem: QuestionItem = {
      id: `q_${Date.now()}`,
      question: newQuestion.trim(),
      created_at: "agora mesmo",
    };
    const updated = [newItem, ...questions];
    setQuestions(updated);
    try {
      localStorage.setItem(`questions_${productId}`, JSON.stringify(updated));
    } catch {}
    setNewQuestion("");
    toast.success("Sua pergunta foi enviada ao vendedor!");
  };

  const handleAddToCart = (redirectCheckout: boolean) => {
    if (!product) return;
    markAsPurchasedOrInCart(product.id);
    add(
      {
        productId: product.id,
        title: product.title,
        price: Number(product.price),
        imageUrl: product.image_url ?? undefined,
        maxStock: product.stock ?? 99,
        freeShipping: true,
        storeId: product.store_id,
        storeName: product.stores?.name ?? "Loja JJ Kuster",
        productType: (product.product_type as "physical" | "digital") ?? "physical",
      },
      quantity
    );
    if (redirectCheckout) {
      navigate({ to: "/_authenticated/carrinho" });
    } else {
      toast.success(`${quantity}x ${product.title} adicionado ao carrinho!`);
    }
  };

  // Carrossel interno para produtos semelhantes
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  const scrollCarousel = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-2xl bg-muted/40" />
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted/40" />
              <div className="h-8 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="h-6 w-1/4 animate-pulse rounded bg-muted/40" />
              <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
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
          <p className="mt-2 text-sm text-muted-foreground">
            O produto que você procura pode ter sido removido ou está indisponível no momento.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar para a Vitrine</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 overflow-hidden">
        {/* Breadcrumb de navegação */}
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap pb-1">
          <Link to="/" className="hover:text-primary">
            Início
          </Link>
          <span>/</span>
          <span className="capitalize">{product.category || "Geral"}</span>
          <span>/</span>
          <span className="truncate max-w-[200px] sm:max-w-xs text-foreground font-medium">
            {product.title}
          </span>
        </nav>

        {/* ========================================================= */}
        {/* CARD PRINCIPAL DO PRODUTO: FOTOS + PREÇO MERCADO LIVRE */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* GALERIA DE FOTOS (Col 1-7) */}
            <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-3">
              {/* Miniaturas Laterais */}
              {media.length > 1 && (
                <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto max-h-[460px] pb-1 sm:pb-0 scrollbar-none shrink-0">
                  {media.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === idx
                          ? "border-primary shadow-sm"
                          : "border-border/60 hover:border-muted-foreground/40 opacity-70"
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={`Miniatura ${idx + 1}`}
                        className="h-full w-full object-contain p-1"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Foto Principal com Swipe */}
              <div
                className="relative flex-1 aspect-square max-h-[480px] w-full rounded-xl bg-muted/10 border border-border/40 overflow-hidden flex items-center justify-center p-4 touch-pan-y"
                onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchStartX === null) return;
                  const diff = touchStartX - e.changedTouches[0].clientX;
                  if (diff > 50 && selectedImage < media.length - 1) {
                    setSelectedImage((prev) => prev + 1);
                  } else if (diff < -50 && selectedImage > 0) {
                    setSelectedImage((prev) => prev - 1);
                  }
                  setTouchStartX(null);
                }}
              >
                {currentMedia ? (
                  <img
                    src={currentMedia.url}
                    alt={product.title}
                    className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <Box className="h-16 w-16 text-muted-foreground/30" />
                )}

                {/* Botão de Favoritar */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFavorite(!isFavorite);
                    toast.success(
                      !isFavorite ? "Salvo nos seus favoritos!" : "Removido dos favoritos."
                    );
                  }}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-sm transition-transform active:scale-90"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* PAINEL DE DETALHES E PREÇOS (Col 8-12) */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                {/* Status, Vendas e Estrelas */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Novo</span>
                  <span>•</span>
                  <span>+{salesCount} vendidos</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    ★ {averageRating.toFixed(1)}
                    <span className="text-muted-foreground font-normal">
                      ({totalReviewsCount})
                    </span>
                  </span>
                </div>

                <h1 className="mt-2 text-base sm:text-xl font-bold leading-snug text-foreground">
                  {product.title}
                </h1>

                {/* Loja Oficial */}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Vendido e entregue por</span>
                  <span className="font-bold text-primary flex items-center gap-1">
                    Loja JJ Kuster <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  </span>
                </div>

                {/* ========================================================= */}
                {/* BLOCO DE PREÇOS OFICIAL ESTILO MERCADO LIVRE */}
                {/* ========================================================= */}
                <div className="mt-4 rounded-xl bg-muted/20 p-4 border border-border/80">
                  {/* Linha 1: [XX% OFF] + Preço Riscado */}
                  <div className="flex items-center gap-2 leading-none">
                    <span className="rounded bg-[#00a650] px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {discountPercent}% OFF
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      {brl(originalPrice)}
                    </span>
                  </div>

                  {/* Linha 2: Preço principal em destaque com centavos elevados (<sup>) */}
                  <div className="mt-1 flex items-start leading-none text-foreground">
                    <span className="text-3xl sm:text-4xl font-normal tracking-tight">
                      R$ {priceParts.reais}
                    </span>
                    <sup className="text-sm sm:text-base font-semibold tracking-tight ml-0.5 top-0.5">
                      {priceParts.centavos}
                    </sup>
                  </div>

                  {/* Linha 3: Parcelamento limpo sem juros */}
                  <p className="mt-2 text-xs text-foreground/80 font-normal">
                    em até <span className="font-semibold">{maxInstallments}x de {brl(installmentValue)}</span> sem juros
                  </p>

                  {/* Linha 4: Selo Frete Grátis com complemento */}
                  {!isDigital && (
                    <div className="mt-1.5 flex items-baseline gap-1 text-xs">
                      <span className="font-bold text-[#00a650]">
                        Frete grátis
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        por ser sua primeira compra
                      </span>
                    </div>
                  )}

                  {/* Meios de Pagamento */}
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

                {/* Compartilhar */}
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
                    <span>Envio com código de rastreamento enviado por e-mail</span>
                  </div>
                </div>

                {/* Quantidade */}
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
                      onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                      disabled={quantity >= (product.stock || 99)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({product.stock} disponíveis)
                    </span>
                  </div>
                </div>

                {/* Botões de Compra */}
                <div className="mt-4 space-y-2">
                  <Button
                    onClick={() => handleAddToCart(false)}
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/10 font-bold h-11 text-sm transition"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" /> Adicionar ao Carrinho
                  </Button>

                  <Button
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

        {/* DESCRIÇÃO DO PRODUTO */}
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

        {/* PERGUNTAS E RESPOSTAS */}
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
              <div key={q.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs sm:text-sm">
                <p className="font-semibold text-foreground">P: {q.question}</p>
                {q.answer && (
                  <p className="mt-1 text-muted-foreground pl-3 border-l-2 border-primary">
                    R: {q.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* OPINIÕES DOS COMPRADORES */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm">
          <h2 className="text-lg sm:text-xl font-black text-foreground pb-3 border-b border-border flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Opiniões dos Compradores
          </h2>

          <div className="mt-4 space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="border-b border-border/60 pb-3 last:border-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-500 text-xs">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-foreground">{rev.author}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{rev.date}</span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-foreground/90">{rev.comment}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* CARROSSEL HORIZONTAL DE PRODUTOS SEMELHANTES COM SETAS */}
        {/* ========================================================= */}
        {similarProducts.length > 0 && (
          <section className="mt-10 pt-6 border-t border-border">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
                  Quem viu este produto também comprou
                </h2>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Produtos similares da categoria com Frete Grátis garantido
                </p>
              </div>
            </div>

            <div className="relative group">
              {/* Seta Esquerda Flutuante */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollCarousel("left")}
                  aria-label="Rolar para esquerda"
                  className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl border border-gray-100 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
                >
                  <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
                </button>
              )}

              {/* Trilho de Rolagem Suave */}
              <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 px-1 select-none"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {similarProducts.map((item) => (
                  <div
                    key={item.id}
                    className="w-[200px] sm:w-[220px] md:w-[240px] shrink-0 transition-transform duration-200"
                  >
                    <ProductCard product={item} />
                  </div>
                ))}
              </div>

              {/* Seta Direita Flutuante */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollCarousel("right")}
                  aria-label="Rolar para direita"
                  className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl border border-gray-100 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
                >
                  <ChevronRight className="h-6 w-6 stroke-[2.5]" />
                </button>
              )}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
