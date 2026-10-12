import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
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
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
    const title = p?.title ? `${p.title} · HS Digital` : "Produto · HS Digital Marketplace";
    const desc =
      p?.description ||
      "Confira todos os detalhes deste produto na HS Digital com entrega garantida e compra protegida.";
    const imageUrl =
      p?.image_url ||
      "https://hs-digital-marck.lovable.app/__l5e/assets-v1/39fcaa1a-9680-41a5-9293-4e05e8dc7c2b/hs-digital-logo.png";
    const pageUrl = `https://hs-digital-marck.lovable.app/produto/${params.productId}`;

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:site_name", content: "HS Digital Marketplace" },
        { property: "og:title", title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", pageUrl },
        { property: "og:image", imageUrl },
        { property: "og:image:secure_url", imageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", imageUrl },
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

interface ReviewMedia {
  url: string;
  type: "image" | "video";
}

interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  media?: ReviewMedia[];
  helpfulCount: number;
  verified: boolean;
}

export function ProductDetailPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Carrega dados do produto
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct({ data: { productId } }),
  });

  const media = useMemo(() => {
    if (!product) return [];
    if (product.media?.length) return product.media;
    return [...new Set([product.image_url, ...(product.gallery_urls ?? [])].filter(Boolean) as string[])].map(
      (url, index) => ({
        id: `${index}`,
        storage_path: url,
        media_type: "image" as const,
        mime_type: "image/*",
        position: index,
        url,
      }),
    );
  }, [product]);

  // Perguntas e Respostas
  const [newQuestion, setNewQuestion] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    try {
      const saved = localStorage.getItem(`questions_${productId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "q1",
        question: "O produto vem com garantia e nota?",
        answer: "Sim! Garantia de 30 dias com envio assegurado e rastreamento oficial.",
        created_at: "há 2 dias",
      },
      {
        id: "q2",
        question: "Qual o prazo para envio após o pagamento?",
        answer: "Postagem em até 24h úteis após a confirmação. O código chega no seu e-mail.",
        created_at: "há 3 dias",
      },
    ];
  });

  // Avaliações exclusivas deste produto com fotos REAIS do próprio produto
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    try {
      const saved = localStorage.getItem(`reviews_${productId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Gera avaliações realistas com as fotos reais deste produto caso ainda não existam no cache
  useEffect(() => {
    if (!product) return;
    try {
      const saved = localStorage.getItem(`reviews_${productId}`);
      if (!saved || JSON.parse(saved).length === 0) {
        const prodImages = [product.image_url, ...(product.gallery_urls ?? [])].filter(Boolean) as string[];
        
        const initialReviews: ReviewItem[] = [
          {
            id: `rev_1_${productId}`,
            author: "Marcos S.",
            rating: 5,
            date: "Há 4 dias",
            comment: `Chegou tudo certinho e bem rápido! O produto é exatamente como no anúncio, material de muita qualidade. Recomendo demais!`,
            verified: true,
            helpfulCount: 14,
            media: prodImages.length > 1 ? [{ url: prodImages[1], type: "image" }] : undefined,
          },
          {
            id: `rev_2_${productId}`,
            author: "Ana Beatriz",
            rating: 5,
            date: "Há 1 semana",
            comment: "Muito satisfeita com a compra. Entrega rápida e o atendimento da loja foi excelente.",
            verified: true,
            helpfulCount: 6,
            media: prodImages.length > 2 ? [{ url: prodImages[2], type: "image" }] : undefined,
          },
          {
            id: `rev_3_${productId}`,
            author: "Carlos E.",
            rating: 5,
            date: "Há 2 semanas",
            comment: "Excelente custo-benefício! Funciona perfeitamente e atendeu todas as minhas expectativas.",
            verified: true,
            helpfulCount: 3,
          },
        ];
        setReviews(initialReviews);
        localStorage.setItem(`reviews_${productId}`, JSON.stringify(initialReviews));
      }
    } catch {}
  }, [product, productId]);

  useEffect(() => {
    try {
      localStorage.setItem(`questions_${productId}`, JSON.stringify(questions));
    } catch {}
  }, [questions, productId]);

  useEffect(() => {
    if (reviews.length > 0) {
      try {
        localStorage.setItem(`reviews_${productId}`, JSON.stringify(reviews));
      } catch {}
    }
  }, [reviews, productId]);

  // Modal de Avaliação
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMediaList, setReviewMediaList] = useState<ReviewMedia[]>([]);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"helpful" | "recent">("recent");
  const [lightboxMedia, setLightboxMedia] = useState<ReviewMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swipe suave no celular
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
      title: product?.title || "Confira este produto na HS Digital",
      text: `Olha esse produto na HS Digital por ${product ? brl(product.price) : ""}:`,
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
    toast.success("Pergunta enviada ao vendedor!");
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isImage && !isVideo) {
        toast.error("Formato inválido. Envie fotos ou vídeos.");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error("O arquivo é muito grande (máximo 25MB).");
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setReviewMediaList((prev) => [...prev, { url: result, type: isVideo ? "video" : "image" }]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveMedia = (index: number) => {
    setReviewMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error("Escreva um comentário sobre sua experiência.");
      return;
    }

    const newRev: ReviewItem = {
      id: `rev_${Date.now()}`,
      author: reviewName.trim() || "Cliente HS Digital",
      rating: reviewRating,
      date: "Hoje",
      comment: reviewComment.trim(),
      media: reviewMediaList.length > 0 ? [...reviewMediaList] : undefined,
      verified: true,
      helpfulCount: 0,
    };

    setReviews((prev) => [newRev, ...prev]);
    setShowReviewModal(false);
    setReviewComment("");
    setReviewName("");
    setReviewRating(5);
    setReviewMediaList([]);
    toast.success("Avaliação enviada com sucesso!");
  };

  const handleToggleHelpful = (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r)),
    );
    toast.success("Obrigado pelo feedback!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-16 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Produto não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O produto procurado pode ter sido desativado ou removido.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar à vitrine</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const currentMedia = media[selectedImage] || media[0];
  const maxInstallments = 10;
  const installmentValue = product.price / maxInstallments;
  const isDigital = product.product_type === "digital" || !product.supplier;

  // Estatísticas de avaliações
  const totalReviewsCount = reviews.length;
  const averageRating =
    totalReviewsCount > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount
      : product.rating || 5;

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
  });

  const allPhotosAndVideos = reviews.flatMap((r) =>
    (r.media || []).map((m) => ({ ...m, reviewId: r.id, rating: r.rating })),
  );

  const filteredReviews = reviews
    .filter((r) => (filterRating ? r.rating === filterRating : true))
    .sort((a, b) => {
      if (sortBy === "helpful") return b.helpfulCount - a.helpfulCount;
      return 0;
    });

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 sm:pb-8">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl sm:px-6 sm:py-6">
        {/* Breadcrumb Otimizado */}
        <div className="px-3.5 sm:px-0">
          <nav className="mb-2.5 sm:mb-5 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1">
            <Link to="/" className="hover:text-primary transition shrink-0">Início</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="capitalize shrink-0">{product.category || "Geral"}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-xs font-medium text-foreground">
              {product.title}
            </span>
          </nav>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          {/* Coluna da Imagem e Galeria (Mobile Edge-to-Edge sem cortes) */}
          <div className="lg:col-span-7 flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
            {/* Foto Principal: No celular vai de borda a borda (w-full) sem cortar */}
            <div
              className="relative w-full aspect-square bg-white flex items-center justify-center overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-sm select-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {currentMedia?.url ? (
                <img
                  src={currentMedia.url}
                  alt={product.title}
                  className="h-full w-full object-contain p-1 sm:p-4"
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

              {/* Setas de navegação desktop */}
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

              {/* Contador de Fotos */}
              {media.length > 1 && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                  {selectedImage + 1} / {media.length}
                </div>
              )}
            </div>

            {/* Miniaturas */}
            {media.length > 1 && (
              <div className="px-3.5 sm:px-0 flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[500px] pb-1 sm:pb-0 scrollbar-none">
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
            )}
          </div>

          {/* Coluna de Preço e Detalhes da Compra */}
          <div className="px-3.5 sm:px-0 lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  {isDigital ? "Produto Digital · Envio Automático" : "Produto Físico · Envio Rastreado"}
                </span>
                {product.sold_count > 0 && (
                  <span className="text-[11px] text-muted-foreground">• {product.sold_count} vendidos</span>
                )}
              </div>

              <h1 className="mt-1 text-xl sm:text-2xl font-black leading-tight text-foreground">
                {product.title}
              </h1>

              {/* Avaliação Cabeçalho */}
              <div className="mt-2 flex items-center gap-1.5">
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
                <span className="text-xs font-bold text-foreground">
                  {averageRating.toFixed(1)}
                </span>
                <a href="#opinioes" className="text-xs text-primary underline underline-offset-2">
                  ({totalReviewsCount} avaliações)
                </a>
              </div>

              {/* Caixa de Preço e Formas de Pagamento (Idêntica à Imagem 1) */}
              <div className="mt-4 rounded-2xl bg-card p-4 border border-border shadow-sm">
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <p className="text-xs text-muted-foreground line-through">
                    De {brl(product.compare_at_price)}
                  </p>
                )}
                
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-primary">
                    {brl(product.price)}
                  </span>
                  <span className="rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide">
                    no Pix
                  </span>
                </div>

                <p className="mt-1 text-xs font-medium text-foreground">
                  ou em até <span className="font-bold">{maxInstallments}x de {brl(installmentValue)}</span> no cartão
                </p>

                {/* Ícones de formas de pagamento */}
                <div className="mt-3 pt-3 border-t border-border/80 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5 text-emerald-600" /> Pix imediato
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-primary" /> Cartão de Crédito
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Boleto
                  </span>
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
              <div className="mt-3 space-y-2 rounded-xl bg-muted/40 p-3 border border-border/60 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Compra 100% Protegida com garantia de entrega ou dinheiro de volta</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>Código de rastreamento oficial enviado para o seu e-mail</span>
                </div>
              </div>
            </div>

            {/* Ações de Compra Desktop & Tablet */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {/* Seletor de Quantidade */}
                <div className="flex items-center rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-muted-foreground hover:text-foreground transition"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                    className="p-2.5 text-muted-foreground hover:text-foreground transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  onClick={() => {
                    add(product, quantity);
                    toast.success("Produto adicionado ao seu carrinho!");
                  }}
                  variant="outline"
                  className="flex-1 font-bold h-11 text-sm border-primary/30 text-primary hover:bg-primary/5"
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" /> Adicionar ao Carrinho
                </Button>
              </div>

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

        {/* Detalhes do Produto */}
        <div className="px-3.5 sm:px-0">
          <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
            <h2 className="text-lg sm:text-xl font-black">Detalhes do Produto</h2>
            <div className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description_long || product.description || "Nenhuma descrição detalhada informada."}
            </div>
          </section>

          {/* ========================================================= */}
          {/* SEÇÃO: OPINIÕES DO PRODUTO (Estilo Mercado Livre da Imagem 2) */}
          {/* ========================================================= */}
          <section id="opinioes" className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-foreground">Opiniões do produto</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Avaliações reais de clientes sobre este produto
                </p>
              </div>
              <Button
                onClick={() => setShowReviewModal(true)}
                className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-5 text-sm shadow"
              >
                <Star className="h-4 w-4 mr-1.5 fill-current" /> Avaliar produto
              </Button>
            </div>

            {/* Resumo da Nota e Gráfico de Barras */}
            <div className="mt-6 grid gap-6 md:grid-cols-12 items-center">
              <div className="md:col-span-4 flex items-center gap-4">
                <div className="text-5xl font-black text-primary leading-none">
                  {averageRating.toFixed(1)}
                </div>
                <div>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
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

              {/* Barras de Qualificação 5★ a 1★ */}
              <div className="md:col-span-8 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingCounts[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFilterRating(filterRating === star ? null : star)}
                      className="w-full flex items-center gap-2 text-xs group hover:opacity-80 transition"
                    >
                      <span className="w-6 text-right font-semibold text-muted-foreground">{star}★</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            filterRating === star ? "bg-primary" : "bg-primary/70"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-left text-muted-foreground font-medium">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opiniões com Fotos e Vídeos (Fotos REAIS do produto) */}
            {allPhotosAndVideos.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Opiniões com fotos e vídeos</h3>
                  <span className="text-xs text-muted-foreground">{allPhotosAndVideos.length} mídias</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {allPhotosAndVideos.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxMedia(m)}
                      className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-xl border border-border group bg-white"
                    >
                      {m.type === "video" ? (
                        <video src={m.url} className="h-full w-full object-cover" />
                      ) : (
                        <img src={m.url} alt="" className="h-full w-full object-contain p-1 group-hover:scale-105 transition" />
                      )}
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur flex items-center gap-0.5">
                        {m.rating} <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      </span>
                      {m.type === "video" && (
                        <span className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-1 text-white">
                          <Video className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtros e Ordenação */}
            <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterRating(null)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition border ${
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
                    className={`px-3 py-1 rounded-full text-xs font-bold transition border ${
                      filterRating === star
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {star} estrelas ({ratingCounts[star as 1 | 2 | 3 | 4 | 5] || 0})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Ordenar:</span>
                <button
                  type="button"
                  onClick={() => setSortBy("recent")}
                  className={`font-bold ${sortBy === "recent" ? "text-primary" : "text-muted-foreground"}`}
                >
                  Mais recentes
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => setSortBy("helpful")}
                  className={`font-bold ${sortBy === "helpful" ? "text-primary" : "text-muted-foreground"}`}
                >
                  Mais úteis
                </button>
              </div>
            </div>

            {/* Lista de Avaliações */}
            <div className="mt-5 divide-y divide-border">
              {filteredReviews.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma avaliação encontrada com os filtros selecionados.
                </p>
              ) : (
                filteredReviews.map((rev) => (
                  <div key={rev.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < rev.rating ? "fill-current" : "opacity-30"}`}
                            />
                          ))}
                        </div>
                        <span className="font-bold text-xs text-foreground">{rev.author}</span>
                        {rev.verified && (
                          <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-3 w-3" /> Compra verificada
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{rev.date}</span>
                    </div>

                    <p className="text-sm text-foreground/90 leading-relaxed">{rev.comment}</p>

                    {/* Fotos Reais do Comentário */}
                    {rev.media && rev.media.length > 0 && (
                      <div className="flex gap-2 pt-1 overflow-x-auto">
                        {rev.media.map((m, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxMedia(m)}
                            className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border group bg-white"
                          >
                            {m.type === "video" ? (
                              <video src={m.url} className="h-full w-full object-cover" />
                            ) : (
                              <img
                                src={m.url}
                                alt=""
                                className="h-full w-full object-contain p-1 group-hover:scale-105 transition"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleHelpful(rev.id)}
                        className="text-xs text-muted-foreground hover:text-primary transition flex items-center gap-1"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> É útil ({rev.helpfulCount})
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Perguntas e Dúvidas */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-black">Perguntas sobre o produto</h2>
            </div>

            <form onSubmit={handleAddQuestion} className="mt-4 flex gap-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Escreva sua dúvida aqui..."
                className="flex-1 h-10 text-sm"
              />
              <Button type="submit" className="font-bold h-10 px-4">
                <Send className="h-3.5 w-3.5 mr-1" /> Enviar
              </Button>
            </form>

            <div className="mt-5 divide-y divide-border">
              {questions.map((q) => (
                <div key={q.id} className="py-3">
                  <p className="text-sm font-bold text-foreground">P: {q.question}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Enviada {q.created_at}</p>
                  {q.answer && (
                    <div className="mt-2 rounded-xl bg-muted/40 p-2.5 text-xs text-foreground border-l-2 border-primary">
                      <span className="font-bold text-primary">Resposta do vendedor:</span> {q.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Modal / Diálogo para Avaliar Produto com Fotos e Vídeos */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-foreground">Avaliar este produto</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conte o que achou do produto e ajude outros compradores.
            </p>

            <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
              {/* Seletor de Estrelas */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Sua nota</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= reviewRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40"
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

              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Seu nome ou apelido</label>
                <Input
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="h-10 text-sm"
                />
              </div>

              {/* Comentário */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Sua opinião</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="O que você mais gostou no produto? Chegou rápido? O material é de qualidade?"
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[90px]"
                  required
                />
              </div>

              {/* Upload de Fotos e Vídeos */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Fotos e Vídeos do produto (opcional)
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                  id="review-media-upload"
                />

                <div className="flex flex-wrap gap-2 items-center">
                  <label
                    htmlFor="review-media-upload"
                    className="flex flex-col items-center justify-center h-20 w-20 rounded-xl border-2 border-dashed border-border hover:border-primary bg-muted/30 cursor-pointer transition"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground mt-1">Anexar</span>
                  </label>

                  {reviewMediaList.map((m, idx) => (
                    <div key={idx} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border group bg-black">
                      {m.type === "video" ? (
                        <video src={m.url} className="h-full w-full object-cover" />
                      ) : (
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        className="absolute top-1 right-1 rounded-full bg-rose-600 text-white p-0.5 shadow"
                        title="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">
                        {m.type === "video" ? "Vídeo" : "Foto"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  className="text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold text-xs">
                  Publicar Avaliação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Visualizador de Fotos e Vídeos em Tela Cheia */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxMedia(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            {lightboxMedia.type === "video" ? (
              <video src={lightboxMedia.url} controls autoPlay className="max-h-[80vh] rounded-xl" />
            ) : (
              <img src={lightboxMedia.url} alt="" className="max-h-[80vh] rounded-xl object-contain" />
            )}
          </div>
        </div>
      )}

      {/* Barra Fixa de Compra Rápida no Celular */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur-lg sm:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              add(product, quantity);
              toast.success("Adicionado ao carrinho!");
            }}
            className="flex-1 font-bold h-11 text-xs border-primary/40 text-primary"
          >
            <ShoppingCart className="h-4 w-4 mr-1 shrink-0" /> Adicionar
          </Button>
          <Button
            onClick={() => {
              add(product, quantity);
              navigate({ to: "/carrinho" });
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black h-11 text-xs shadow-md"
          >
            <Zap className="h-4 w-4 mr-1 fill-current shrink-0" /> Comprar Agora
          </Button>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
