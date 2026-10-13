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
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { fetchProduct } from "@/lib/catalog.functions";
import { brl } from "@/lib/format";

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

  // Avaliações estritamente em texto limpo com persistência garantida no navegador
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

  useEffect(() => {
    try {
      localStorage.setItem(`questions_${productId}`, JSON.stringify(questions));
    } catch {}
  }, [questions, productId]);

  // Modal de Avaliação
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"helpful" | "recent">("recent");

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) setTouchStartX(touch.clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touch = e.changedTouches[0];
    if (touch) {
      const diff = touchStartX - touch.clientX;
      if (Math.abs(diff) > 40 && media.length > 1) {
        if (diff > 0) {
          setSelectedImage((prev) => (prev + 1) % media.length);
        } else {
          setSelectedImage((prev) => (prev - 1 + media.length) % media.length);
        }
      }
    }
    setTouchStartX(null);
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: product?.title || "Confira este produto na Loja JJ Kuster",
      text: `Olha esse produto que encontrei na Loja JJ Kuster por apenas ${product ? brl(product.price) : ""}:`,
      url: shareUrl,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => undefined);
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link do produto copiado com sucesso!");
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const item: QuestionItem = {
      id: `q_${Date.now()}`,
      question: newQuestion.trim(),
      created_at: "agora mesmo",
    };
    setQuestions((prev) => [item, ...prev]);
    setNewQuestion("");
    toast.success("Pergunta enviada para a Loja JJ Kuster!");
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error("Por favor, escreva um comentário sobre o produto.");
      return;
    }

    const newRev: ReviewItem = {
      id: `rev_${Date.now()}`,
      author: reviewName.trim() || "Cliente JJ Kuster",
      rating: reviewRating,
      date: "Brasil · Hoje",
      comment: reviewComment.trim(),
      packagingNote: "Compra com envio rastreado oficial",
      verified: true,
      helpfulCount: 0,
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem(`reviews_${productId}`, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar avaliação:", e);
    }

    setShowReviewModal(false);
    setReviewComment("");
    setReviewName("");
    setReviewRating(5);
    toast.success("Avaliação enviada com sucesso!");
  };

  const handleToggleHelpful = (reviewId: string) => {
    const updated = reviews.map((r) =>
      r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r,
    );
    setReviews(updated);
    try {
      localStorage.setItem(`reviews_${productId}`, JSON.stringify(updated));
    } catch {}
    toast.success("Obrigado pelo seu feedback!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted" />
            <div className="space-y-4">
              <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-28 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <SiteHeader />
        <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-3" />
          <h1 className="text-xl font-bold">Produto não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este produto pode ter sido removido ou está temporariamente indisponível.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const salesCount = getConsistentSalesCount(product.id);
  const totalReviewsCount = reviews.length;
  const averageRating =
    totalReviewsCount > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount
      : 5.0;

  const ratingCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating as 1 | 2 | 3 | 4 | 5] = (ratingCounts[r.rating as 1 | 2 | 3 | 4 | 5] || 0) + 1;
    }
  });

  const filteredReviews = reviews
    .filter((r) => (filterRating === null ? true : r.rating === filterRating))
    .sort((a, b) => {
      if (sortBy === "helpful") return b.helpfulCount - a.helpfulCount;
      return 0;
    });

  const maxInstallments = 10;
  const installmentValue = product.price / maxInstallments;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full overflow-x-hidden">
      <SiteHeader />

      <main className="w-full max-w-7xl mx-auto overflow-x-hidden sm:px-6 sm:py-6">
        {/* Breadcrumb */}
        <div className="w-full px-3.5 sm:px-0 min-w-0">
          <nav className="mb-2.5 sm:mb-4 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1 max-w-full min-w-0">
            <Link to="/" className="hover:text-primary transition shrink-0">Início</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="capitalize shrink-0">{product.category || "Geral"}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-xs font-medium text-foreground">
              {product.title}
            </span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 w-full min-w-0">
          {/* Coluna da Imagem e Galeria */}
          <div className="lg:col-span-7 w-full min-w-0 flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
            {/* Foto Principal com Efeito de Zoom Suave no Hover */}
            <div
              className="relative w-full aspect-square bg-white flex items-center justify-center overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-sm select-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {currentMedia?.url ? (
                <img
                  src={currentMedia.url}
                  alt={product.title}
                  className="h-full w-full object-contain p-2 sm:p-4 transition-transform duration-300 hover:scale-110 cursor-zoom-in"
                />
              ) : (
                <div className="text-muted-foreground text-sm">Sem imagem</div>
              )}

              {/* Botões Flutuantes no Topo */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-full bg-white/95 p-2 text-foreground shadow-md backdrop-blur transition hover:text-primary"
                  title="Compartilhar produto"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFavorite(!isFavorite);
                    toast.success(isFavorite ? "Removido dos favoritos" : "Salvo nos favoritos!");
                  }}
                  className={`rounded-full bg-white/95 p-2 shadow-md backdrop-blur transition ${
                    isFavorite ? "text-rose-500" : "text-foreground hover:text-rose-500"
                  }`}
                  title="Favoritar"
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                </button>
              </div>

              {product.free_shipping && (
                <span className="absolute top-3 left-3 z-10 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
                  FRETE GRÁTIS
                </span>
              )}

              {/* Setas Desktop */}
              {media.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedImage((prev) => (prev - 1 + media.length) % media.length)}
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white text-foreground"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImage((prev) => (prev + 1) % media.length)}
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white text-foreground"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {media.length > 1 && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                  {selectedImage + 1} / {media.length}
                </div>
              )}
            </div>

            {/* Miniaturas */}
            {media.length > 1 && (
              <div className="w-full min-w-0 px-3.5 sm:px-0">
                <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[500px] pb-1 sm:pb-0 scrollbar-none w-full min-w-0">
                  {media.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedImage(index)}
                      className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border-2 transition bg-white ${
                        selectedImage === index
                          ? "border-primary ring-1 ring-primary shadow-sm"
                          : "border-border/80 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={item.url}
                        alt=""
                        className="h-full w-full object-contain p-0.5"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coluna de Preço, Compra e Pagamentos */}
          <div className="lg:col-span-5 w-full min-w-0 px-3.5 sm:px-0 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm w-full min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Novo</span>
                <span>•</span>
                <span>+{salesCount} vendidos</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  ★ {averageRating.toFixed(1)}
                  <span className="text-muted-foreground font-normal">({totalReviewsCount})</span>
                </span>
              </div>

              <h1 className="mt-2 text-lg sm:text-2xl font-bold leading-snug text-foreground">
                {product.title}
              </h1>

              {/* Loja Oficial */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Vendido e entregue por</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  Loja JJ Kuster <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                </span>
              </div>

              {/* Preço e Parcelamento */}
              <div className="mt-4 rounded-xl bg-muted/30 p-3 sm:p-4 border border-border/80">
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground line-through">
                      {brl(product.compare_at_price)}
                    </span>
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                      {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF
                    </span>
                  </div>
                )}

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                    {brl(product.price)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">no Pix</span>
                </div>

                <p className="mt-1 text-xs font-medium text-foreground">
                  ou em até <span className="font-bold">{maxInstallments}x de {brl(installmentValue)}</span> sem juros no cartão
                </p>

                {/* Meios de Pagamento Aceitos: PIX e Cartão de Crédito (Sem Boleto) */}
                <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Meios de pagamento aceitos via Mercado Pago:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 text-center">
                      <QrCode className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
                      <p className="text-[11px] font-bold">Pix</p>
                      <p className="text-[9px] text-muted-foreground">Aprovação imediata</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 text-center">
                      <CreditCard className="h-4 w-4 mx-auto text-primary mb-1" />
                      <p className="text-[11px] font-bold">Cartão de Crédito</p>
                      <p className="text-[9px] text-muted-foreground">Até 10x sem juros</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Compartilhar */}
              <Button
                variant="outline"
                onClick={handleShare}
                className="mt-3 w-full border-border text-foreground hover:bg-muted font-semibold text-xs h-9"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Compartilhar produto
              </Button>

              {/* Garantias */}
              <div className="mt-3 space-y-2 rounded-xl bg-muted/40 p-3 border border-border/60 text-xs text-muted-foreground w-full min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Compra 100% Protegida pela Loja JJ Kuster com garantia oficial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>Envio com código de rastreamento oficial enviado para o seu e-mail</span>
                </div>
              </div>

              {/* Seletor de Quantidade */}
              <div className="mt-4 flex items-center justify-between border-y border-border py-3">
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

              {/* Botões de Ação */}
              <div className="mt-4 space-y-2">
                <Button
                  onClick={() => {
                    add(product, quantity);
                    toast.success(`${quantity}x ${product.title} adicionado ao carrinho!`);
                  }}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10 font-bold h-11 text-sm transition"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" /> Adicionar ao Carrinho
                </Button>

                <Button
                  onClick={() => {
                    add(product, quantity);
                    navigate({ to: "/carrinho" });
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-12 text-base shadow-md transition"
                >
                  <Zap className="h-4 w-4 mr-1.5 fill-current" /> Comprar Agora
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESCRIÇÃO PROFISSIONAL DETALHADA ESTILO MERCADO LIVRE */}
        {/* ========================================================= */}
        <div className="w-full min-w-0 px-3.5 sm:px-0">
          <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm w-full min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-foreground pb-3 border-b border-border flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Descrição do Produto
            </h2>

            <div className="mt-5 space-y-6 text-sm text-foreground/90 leading-relaxed">
              {/* Título de Apresentação */}
              <div>
                <h3 className="font-bold text-base sm:text-lg text-foreground">
                  {product.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Produto 100% original, novo e com envio protegido com código de rastreamento oficial.
                </p>
              </div>

              {/* Descrição Principal Cadastrada */}
              {product.description && (
                <div className="rounded-xl bg-muted/20 p-4 border border-border/60 text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              )}

              {/* Diferenciais e Garantias Estilo ML */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Destaques e Vantagens:
                </h4>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-xs sm:text-sm">
                  <li><strong className="text-foreground">Qualidade Assegurada:</strong> Testado e inspecionado rigorosamente antes do envio.</li>
                  <li><strong className="text-foreground">Envio Imediato e Seguro:</strong> Embalagem reforçada com proteção contra impactos no transporte.</li>
                  <li><strong className="text-foreground">Compra Garantida:</strong> Garantia contra defeitos de fabricação e suporte dedicado da loja.</li>
                  <li><strong className="text-foreground">Pronto para Uso:</strong> Acompanha todos os itens e manuais originais de fábrica.</li>
                </ul>
              </div>

              {/* Ficha Técnica / Especificações Estilo Mercado Livre */}
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2 mb-3">
                  <Box className="h-4 w-4 text-primary" /> Ficha Técnica & Características:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-muted/40 p-3 rounded-xl border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Condição do item:</span>
                    <strong className="text-foreground">Novo (Lacrado)</strong>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Categoria:</span>
                    <strong className="capitalize text-foreground">{product.category || "Geral"}</strong>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Disponibilidade:</span>
                    <strong className="text-emerald-600">Em estoque ({product.stock} un.)</strong>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Garantia do vendedor:</span>
                    <strong className="text-foreground">30 dias</strong>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Origem do envio:</span>
                    <strong className="text-foreground">Brasil (Rastreamento Correios)</strong>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Forma de pagamento:</span>
                    <strong className="text-foreground">Mercado Pago (Pix / Cartão)</strong>
                  </div>
                </div>
              </div>

              {/* Descrição Detalhada Adicional */}
              {product.description_long && product.description_long !== product.description && (
                <div className="pt-2 border-t border-border">
                  <h4 className="font-bold text-sm text-foreground mb-2">Informações Complementares:</h4>
                  <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/50">
                    {product.description_long}
                  </div>
                </div>
              )}

              {/* Itens Inclusos */}
              <div className="pt-2 border-t border-border">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> O que você está comprando:
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  • 1x <strong>{product.title}</strong> novo e completo na embalagem oficial.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  • Certificado de envio e comprovante de compra protegida.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SEÇÃO: OPINIÕES DO PRODUTO (100% Texto Limpo) */}
          {/* ========================================================= */}
          <section id="opinioes" className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-foreground">Opiniões do produto</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Avaliações de clientes que compraram na Loja JJ Kuster
                </p>
              </div>

              <Button
                onClick={() => setShowReviewModal(true)}
                className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-4 text-xs sm:text-sm shadow flex items-center justify-center gap-2"
              >
                Escrever avaliação
              </Button>
            </div>

            {/* Resumo da Nota e Gráfico de Barras */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center w-full min-w-0">
              <div className="md:col-span-4 flex items-center gap-3">
                <div className="text-4xl sm:text-5xl font-black text-primary leading-none">
                  {averageRating.toFixed(1)}
                </div>
                <div>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Math.floor(averageRating) ? "fill-current" : "opacity-30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalReviewsCount} {totalReviewsCount === 1 ? "avaliação" : "avaliações"}
                  </p>
                </div>
              </div>

              <div className="md:col-span-8 space-y-1.5 w-full min-w-0">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingCounts[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFilterRating(filterRating === star ? null : star)}
                      className="w-full flex items-center gap-2 text-xs group hover:opacity-80 transition min-w-0"
                    >
                      <span className="w-5 text-right font-semibold text-muted-foreground shrink-0">{star}★</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-0">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            filterRating === star ? "bg-primary" : "bg-primary/70"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-6 text-left text-muted-foreground font-medium shrink-0">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtros e Ordenação */}
            <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full sm:w-auto min-w-0">
                <button
                  type="button"
                  onClick={() => setFilterRating(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition border shrink-0 ${
                    filterRating === null
                      ? "bg-primary text-white border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  Todas ({totalReviewsCount})
                </button>
                {[5, 4, 3].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFilterRating(filterRating === star ? null : star)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition border shrink-0 ${
                      filterRating === star
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {star}★ ({ratingCounts[star as 1 | 2 | 3 | 4 | 5] || 0})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <span>Ordenar:</span>
                <button
                  type="button"
                  onClick={() => setSortBy("recent")}
                  className={`font-bold ${sortBy === "recent" ? "text-primary" : "text-muted-foreground"}`}
                >
                  Mais recentes
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSortBy("helpful")}
                  className={`font-bold ${sortBy === "helpful" ? "text-primary" : "text-muted-foreground"}`}
                >
                  Mais úteis
                </button>
              </div>
            </div>

            {/* Lista de Avaliações em Texto Limpo */}
            <div className="mt-4 divide-y divide-border w-full min-w-0">
              {filteredReviews.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma avaliação encontrada com os filtros selecionados.
                </p>
              ) : (
                filteredReviews.map((rev) => (
                  <div key={rev.id} className="py-4 space-y-2 w-full min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <div className="flex text-amber-400 shrink-0">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < rev.rating ? "fill-current" : "opacity-30"}`}
                            />
                          ))}
                        </div>
                        <span className="font-bold text-xs text-foreground truncate max-w-[120px]">{rev.author}</span>
                        {rev.verified && (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold bg-emerald-500/10 px-1 py-0.5 rounded shrink-0">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Compra verificada
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{rev.date}</span>
                    </div>

                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed break-words">{rev.comment}</p>

                    {rev.packagingNote && (
                      <p className="text-[11px] text-muted-foreground italic bg-muted/30 px-2 py-1 rounded-md">
                        {rev.packagingNote}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleHelpful(rev.id)}
                        className="text-[11px] text-muted-foreground hover:text-primary transition flex items-center gap-1"
                      >
                        <ThumbsUp className="h-3 w-3" /> Útil ({rev.helpfulCount})
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Perguntas e Dúvidas */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm w-full min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-black">Perguntas sobre o produto</h2>
            </div>

            <form onSubmit={handleAddQuestion} className="mt-4 flex gap-2 w-full min-w-0">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Tire sua dúvida com a Loja JJ Kuster..."
                className="flex-1 h-10 text-xs sm:text-sm min-w-0"
              />
              <Button type="submit" className="font-bold h-10 px-3 sm:px-4 shrink-0 text-xs sm:text-sm">
                <Send className="h-3.5 w-3.5 mr-1" /> Perguntar
              </Button>
            </form>

            <div className="mt-4 divide-y divide-border w-full min-w-0">
              {questions.map((q) => (
                <div key={q.id} className="py-3 w-full min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-foreground break-words">P: {q.question}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Enviada {q.created_at}</p>
                  {q.answer && (
                    <div className="mt-2 rounded-xl bg-muted/40 p-2.5 text-xs text-foreground border-l-2 border-primary break-words">
                      <span className="font-bold text-primary">Resposta da Loja JJ Kuster:</span> {q.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Modal para Avaliar Produto (Apenas Texto Limpo) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-card p-5 sm:p-6 shadow-2xl border border-border max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base sm:text-lg font-black text-foreground">Avaliar este produto</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compartilhe sua opinião sobre o produto e ajude outros compradores.
            </p>

            <form onSubmit={handleSubmitReview} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Sua nota</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        className={`h-6 w-6 sm:h-7 sm:w-7 ${
                          star <= reviewRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-foreground">
                    {reviewRating === 5
                      ? "Excelente!"
                      : reviewRating === 4
                        ? "Muito bom"
                        : reviewRating === 3
                          ? "Bom"
                          : reviewRating === 2
                            ? "Ruim"
                            : "Péssimo"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Seu nome ou apelido</label>
                <Input
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Sua opinião sobre o produto</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Conte o que achou do produto, se o material atendeu suas expectativas e se a entrega foi rápida."
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[90px]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold">
                  Publicar Avaliação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
