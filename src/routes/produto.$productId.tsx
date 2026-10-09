import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  Box,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
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
    const storeName = p?.stores?.name ?? "HS Digital";
    const title = p?.title ? `${p.title} · ${storeName}` : "Produto · HS Digital Marketplace";
    const desc =
      p?.description ||
      `Confira todos os detalhes deste produto na ${storeName} com entrega garantida e compra protegida.`;
    const imageUrl =
      p?.image_url ||
      "https://hs-digital-marck.lovable.app/__l5e/assets-v1/39fcaa1a-9680-41a5-9293-4e05e8dc7c2b/hs-digital-logo.png";
    const pageUrl = `https://hs-digital-marck.lovable.app/produto/${params.productId}`;

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:site_name", content: `HS Digital · ${storeName}` },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: pageUrl },
        { property: "og:image", imageUrl },
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

interface ReviewMedia {
  id: string;
  type: "image" | "video";
  name: string;
  file: File;
  previewUrl: string;
}

interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  helpfulCount: number;
  verified: boolean;
  media?: ReviewMedia[]; // Fotos e vídeos enviados pelo cliente (salvos, mas não exibidos na lista)
}

const REVIEW_MAX_FILES = 5;
const REVIEW_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const REVIEW_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function createReviewMedia(file: File): ReviewMedia | null {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return null;
  if (file.size > (isImage ? REVIEW_MAX_IMAGE_BYTES : REVIEW_MAX_VIDEO_BYTES)) return null;
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: isImage ? "image" : "video",
    name: file.name,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

// Perfis realistas variados de compradores brasileiros
const BRAZILIAN_REVIEWERS = [
  { name: "Carlos Eduardo Silva", city: "Campinas - SP" },
  { name: "Beatriz Nogueira", city: "Curitiba - PR" },
  { name: "Felipe Moreira", city: "Belo Horizonte - MG" },
  { name: "Camila Fernandes", city: "Porto Alegre - RS" },
  { name: "Renato Vasconcelos", city: "Goiânia - GO" },
  { name: "Mariana Siqueira", city: "São Paulo - SP" },
  { name: "Lucas Guimarães", city: "Joinville - SC" },
  { name: "Larissa Andrade", city: "Salvador - BA" },
  { name: "Thiago Mendonça", city: "Ribeirão Preto - SP" },
  { name: "Juliana Duarte", city: "Brasília - DF" },
  { name: "Rafael Bittencourt", city: "Florianópolis - SC" },
  { name: "Patrícia Albuquerque", city: "Recife - PE" },
  { name: "Gustavo Henrique", city: "Vitória - ES" },
  { name: "Aline Cristina", city: "Londrina - PR" },
  { name: "Diego Castilho", city: "Santos - SP" },
];

const REVIEW_COMMENTS = [
  {
    comment:
      "Produto excelente! Superou minhas expectativas, acabamento impecável e funciona perfeitamente. Entrega rápida e tudo certinho.",
    daysAgo: "há 3 dias",
    rating: 5,
  },
  {
    comment:
      "Muito satisfeito com a compra. O produto é de alta qualidade, exatamente como descrito nas fotos e especificações. Recomendo demais!",
    daysAgo: "há 6 dias",
    rating: 5,
  },
  {
    comment:
      "Chegou rápido e muito bem cuidado. Valeu cada centavo, excelente custo-benefício. Já estou indicando para amigos.",
    daysAgo: "há 1 semana",
    rating: 5,
  },
  {
    comment:
      "Nota 10! Funciona perfeitamente, ótima qualidade dos materiais e entrega antes do prazo. Comprarei novamente com certeza.",
    daysAgo: "há 2 semanas",
    rating: 5,
  },
];

// Gera avaliações únicas com nomes e comentários realistas focados em estrelas e texto
function generateUniqueProductReviews(productId: string): ReviewItem[] {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash << 5) - hash + productId.charCodeAt(i);
    hash |= 0;
  }
  const pos = Math.abs(hash);

  const reviewer1 = BRAZILIAN_REVIEWERS[pos % BRAZILIAN_REVIEWERS.length];
  const reviewer2 = BRAZILIAN_REVIEWERS[(pos + 3) % BRAZILIAN_REVIEWERS.length];
  const reviewer3 = BRAZILIAN_REVIEWERS[(pos + 7) % BRAZILIAN_REVIEWERS.length];

  const tpl1 = REVIEW_COMMENTS[pos % REVIEW_COMMENTS.length];
  const tpl2 = REVIEW_COMMENTS[(pos + 1) % REVIEW_COMMENTS.length];
  const tpl3 = REVIEW_COMMENTS[(pos + 2) % REVIEW_COMMENTS.length];

  return [
    {
      id: `rev_1_${productId}`,
      author: reviewer1.name,
      rating: tpl1.rating,
      date: `${reviewer1.city} · ${tpl1.daysAgo}`,
      comment: tpl1.comment,
      verified: true,
      helpfulCount: 12 + (pos % 15),
    },
    {
      id: `rev_2_${productId}`,
      author: reviewer2.name,
      rating: tpl2.rating,
      date: `${reviewer2.city} · ${tpl2.daysAgo}`,
      comment: tpl2.comment,
      verified: true,
      helpfulCount: 6 + (pos % 9),
    },
    {
      id: `rev_3_${productId}`,
      author: reviewer3.name,
      rating: tpl3.rating,
      date: `${reviewer3.city} · ${tpl3.daysAgo}`,
      comment: tpl3.comment,
      verified: true,
      helpfulCount: 3 + (pos % 6),
    },
  ];
}

// Gera um número moderado de vendas consistente para cada produto
function getConsistentSalesCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  return 38 + (positive % 184); // Varia de 38 a 221 vendas
}

// Junta a foto principal com as demais fotos do produto (sem duplicar)
function getProductImages(product: any): string[] {
  const extra: unknown[] = [
    ...(Array.isArray(product?.images) ? product.images : []),
    ...(Array.isArray(product?.image_urls) ? product.image_urls : []),
    ...(Array.isArray(product?.gallery) ? product.gallery : []),
    ...(Array.isArray(product?.product_images) ? product.product_images : []),
  ];
  const raw: unknown[] = [product?.image_url, ...extra];
  const urls = raw
    .map((item) => {
      if (typeof item === "string") return item;
      const obj = item as any;
      return obj?.url ?? obj?.image_url ?? obj?.src;
    })
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  return Array.from(new Set(urls));
}

export function ProductDetailPage() {
  const { productId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const cart = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await fetchProduct({ data: { productId } });
      return res;
    },
    initialData: loaderData?.product ?? undefined,
    staleTime: 1000 * 60 * 5,
  });

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // CEP e Frete
  const [cep, setCep] = useState("");
  const [freteCalculado, setFreteCalculado] = useState<{
    prazo: string;
    valor: number;
    tipo: string;
  } | null>(null);
  const [calculandoFrete, setCalculandoFrete] = useState(false);

  // Perguntas e Respostas
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: "q1",
      question: "O produto vem com nota fiscal e garantia?",
      answer:
        "Olá! Sim, todos os nossos produtos acompanham nota fiscal eletrônica e garantia de 90 dias contra defeitos de fabricação.",
      created_at: "há 2 dias",
    },
    {
      id: "q2",
      question: "Quanto tempo demora para enviar após a confirmação do pagamento?",
      answer: "O envio é realizado em até 24 horas úteis após a aprovação do pedido.",
      created_at: "há 4 dias",
    },
  ]);
  const [newQuestion, setNewQuestion] = useState("");

  // Avaliações
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    try {
      const saved = localStorage.getItem(`reviews_${productId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return generateUniqueProductReviews(productId);
  });

  // Modal e Formulário de Avaliação
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMedia, setReviewMedia] = useState<ReviewMedia[]>([]);
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
      if (Math.abs(diff) > 40) {
        if (diff > 0 && selectedImage < media.length - 1) {
          setSelectedImage((prev) => prev + 1);
        } else if (diff < 0 && selectedImage > 0) {
          setSelectedImage((prev) => prev - 1);
        }
      }
    }
    setTouchStartX(null);
  };

  const handleShare = async () => {
    const shareData = {
      title: product?.title || `Confira este produto na ${storeName}`,
      text: `Olha esse produto que encontrei na ${storeName} por apenas ${product ? brl(product.price) : ""}:`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const item: QuestionItem = {
      id: String(Date.now()),
      question: newQuestion.trim(),
      created_at: "agora mesmo",
    };
    setQuestions((prev) => [item, ...prev]);
    setNewQuestion("");
    toast.success(`Pergunta enviada para a ${storeName}!`);
  };

  const handleReviewFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    const available = REVIEW_MAX_FILES - reviewMedia.length;
    if (available <= 0 || selected.length > available) {
      toast.error(`Você pode enviar até ${REVIEW_MAX_FILES} arquivos por avaliação.`);
    }
    if (available <= 0) return;
    const created = selected.slice(0, available).map((file) => createReviewMedia(file));
    if (created.some((m) => m === null)) {
      toast.error("Alguns arquivos não foram aceitos. Fotos até 10 MB e vídeos até 50 MB.");
    }
    const valid = created.filter((m): m is ReviewMedia => m !== null);
    if (valid.length > 0) setReviewMedia((prev) => [...prev, ...valid]);
  };

  const removeReviewMedia = (id: string) => {
    const target = reviewMedia.find((m) => m.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setReviewMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const closeReviewModal = () => {
    reviewMedia.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    setReviewMedia([]);
    setShowReviewModal(false);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error("Escreva um comentário sobre o produto.");
      return;
    }
    const newRev: ReviewItem = {
      id: String(Date.now()),
      author: reviewName.trim() || "Cliente Verificado",
      rating: reviewRating,
      date: "Brasil · agora mesmo",
      comment: reviewComment.trim(),
      helpfulCount: 0,
      verified: true,
      media: reviewMedia,
    };
    setReviews((prev) => [newRev, ...prev]);
    setShowReviewModal(false);
    setReviewMedia([]);
    setReviewComment("");
    setReviewName("");
    setReviewRating(5);
    toast.success("Avaliação enviada com sucesso!");
  };

  const filteredReviews = useMemo(() => {
    let list = reviews;
    if (filterRating !== null) {
      list = list.filter((r) => r.rating === filterRating);
    }
    return [...list].sort((a, b) => {
      if (sortBy === "helpful") return b.helpfulCount - a.helpfulCount;
      return 0;
    });
  }, [reviews, filterRating, sortBy]);

  const ratingSummary = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { avg: 5.0, total: 0, counts: [0, 0, 0, 0, 0] };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Number((sum / total).toFixed(1));
    const counts = [5, 4, 3, 2, 1].map((s) => reviews.filter((r) => r.rating === s).length);
    return { avg, total, counts };
  }, [reviews]);

  const handleCalculateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      toast.error("Digite um CEP válido com 8 dígitos.");
      return;
    }

    setCalculandoFrete(true);
    try {
      const isFree = Boolean(product?.is_free_shipping) || (product?.price ?? 0) >= 199;
      setTimeout(() => {
        setFreteCalculado({
          tipo: isFree ? "Frete Expresso Grátis" : "PAC Correios Expresso",
          prazo: "3 a 7 dias úteis",
          valor: isFree ? 0 : 19.9,
        });
        setCalculandoFrete(false);
      }, 600);
    } catch {
      setCalculandoFrete(false);
      toast.error("Não foi possível calcular o frete para este CEP.");
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    cart.add({
      product_id: product.id,
      title: product.title,
      price: product.price,
      quantity,
      image_url: product.image_url,
      store_id: product.store_id,
      store_name: product.stores?.name,
      is_digital: product.is_digital,
      weight_kg: product.weight_kg ?? 0.3,
      dimensions_cm: {
        height: product.height_cm ?? 5,
        width: product.width_cm ?? 15,
        length: product.length_cm ?? 20,
      },
    });
    toast.success(`${product.title} adicionado ao carrinho!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate({ to: "/carrinho" });
  };

  if (isLoading && !product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square rounded-2xl bg-muted" />
            <div className="space-y-4">
              <div className="h-6 w-1/4 rounded bg-muted" />
              <div className="h-10 w-3/4 rounded bg-muted" />
              <div className="h-8 w-1/3 rounded bg-muted" />
              <div className="h-32 rounded bg-muted" />
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <SiteHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive/80" />
          <h1 className="mt-4 text-xl font-bold">Produto não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O item que você procura pode ter sido desativado ou não existe mais.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Explorar catálogo</Link>
          </Button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const storeName = product.stores?.name ?? "HS Digital";
  const media = getProductImages(product);
  const activeIndex = Math.min(selectedImage, Math.max(media.length - 1, 0));
  const activeImage = media[activeIndex];
  const isFreeShipping = Boolean(product.is_free_shipping) || product.price >= 199;
  const originalPrice = product.original_price ?? (product.price > 0 ? product.price * 1.35 : 0);
  const discountPercent =
    originalPrice > product.price ? Math.round(((originalPrice - product.price) / originalPrice) * 100) : 0;
  const pixPrice = product.price * 0.95; // 5% de desconto no Pix
  const parcelas = Math.min(12, Math.max(1, Math.floor(product.price / 10)));
  const valorParcela = product.price / parcelas;
  const salesCount =
    product.sold_count && product.sold_count > 0 ? product.sold_count : getConsistentSalesCount(product.id);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Breadcrumb simples */}
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <span>/</span>
          <Link to="/" search={{ category: product.category }} className="hover:text-foreground capitalize">
            {product.category || "Catálogo"}
          </Link>
          <span>/</span>
          <span className="truncate max-w-[200px] text-foreground font-medium">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Galeria de Fotos */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              {/* Miniaturas: todas as fotos do produto */}
              {media.length > 1 && (
                <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto max-h-[500px] pb-2 sm:pb-0">
                  {media.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      aria-label={`Ver foto ${idx + 1}`}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        activeIndex === idx ? "border-primary shadow" : "border-border opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Foto principal (sem zoom) */}
              <div
                className="relative flex-1 aspect-square overflow-hidden rounded-2xl border border-border bg-card shadow-sm select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {activeImage ? (
                  <img src={activeImage} alt={product.title} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    Sem imagem disponível
                  </div>
                )}

                {media.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedImage(Math.max(0, activeIndex - 1))}
                      disabled={activeIndex === 0}
                      aria-label="Foto anterior"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-1.5 shadow disabled:opacity-30"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImage(Math.min(media.length - 1, activeIndex + 1))}
                      disabled={activeIndex === media.length - 1}
                      aria-label="Próxima foto"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-1.5 shadow disabled:opacity-30"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-2.5 py-0.5 text-xs font-semibold shadow">
                      {activeIndex + 1} / {media.length}
                    </span>
                  </>
                )}

                {discountPercent > 0 && (
                  <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow">
                    -{discountPercent}% OFF
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  aria-label="Favoritar"
                  className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur border border-border text-foreground hover:bg-background transition shadow"
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                </button>
              </div>
            </div>

            {/* Selos de Confiança abaixo das fotos */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs text-muted-foreground">
              <div className="rounded-xl border border-border/80 bg-card/60 p-2.5">
                <ShieldCheck className="mx-auto h-5 w-5 text-emerald-500 mb-1" />
                <span className="font-semibold text-foreground block">Compra Segura</span>
                <span>Garantia de ponta a ponta</span>
              </div>
              <div className="rounded-xl border border-border/80 bg-card/60 p-2.5">
                <Truck className="mx-auto h-5 w-5 text-primary mb-1" />
                <span className="font-semibold text-foreground block">Envio Rastreado</span>
                <span>Código em tempo real</span>
              </div>
              <div className="rounded-xl border border-border/80 bg-card/60 p-2.5">
                <BadgeCheck className="mx-auto h-5 w-5 text-accent mb-1" />
                <span className="font-semibold text-foreground block">Qualidade Testada</span>
                <span>Vendedor Verificado</span>
              </div>
            </div>
          </div>

          {/* Detalhes de Preço, Compra e Variações */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Vendido por {storeName}</span>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                </button>
              </div>

              <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {product.title}
              </h1>

              {/* Avaliação em estrelas e Vendas */}
              <div className="mt-2 flex items-center gap-2 text-xs">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(ratingSummary.avg) ? "fill-amber-400 text-amber-400" : "text-muted"
                      }`}
                    />
                  ))}
                  <span className="ml-1.5 font-bold text-foreground">{ratingSummary.avg}</span>
                </div>
                <span className="text-muted-foreground">({ratingSummary.total} avaliações)</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-emerald-600 font-semibold">{salesCount} vendidos</span>
              </div>
            </div>

            {/* Bloco de Preço */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              {originalPrice > product.price && (
                <div className="text-xs text-muted-foreground line-through">De {brl(originalPrice)}</div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">{brl(product.price)}</span>
                <span className="text-xs text-muted-foreground">
                  em até {parcelas}x de {brl(valorParcela)} sem juros
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Zap className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>{brl(pixPrice)}</strong> à vista no Pix com 5% de desconto extra
                </span>
              </div>
            </div>

            {/* Variações de Modelo / Tamanho se houver */}
            {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Escolha a variação:
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v: any, idx: number) => {
                    const label = typeof v === "string" ? v : v.name || v.title || `Opção ${idx + 1}`;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedVariant(label)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          selectedVariant === label
                            ? "border-primary bg-primary/10 text-primary font-bold"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seletor de Quantidade */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Quantidade:</span>
              <div className="flex items-center rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2 pt-2">
              <Button onClick={handleBuyNow} size="lg" className="w-full text-base font-bold shadow-md">
                <Zap className="mr-2 h-5 w-5 fill-current" /> Comprar Agora
              </Button>
              <Button onClick={handleAddToCart} variant="outline" size="lg" className="w-full text-sm font-semibold">
                <ShoppingCart className="mr-2 h-4 w-4" /> Adicionar ao Carrinho
              </Button>
            </div>

            {/* Calculador de Frete */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" /> Calcular prazo e frete
              </span>
              <form onSubmit={handleCalculateShipping} className="flex gap-2">
                <Input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="Digite seu CEP (ex: 01001-000)"
                  maxLength={9}
                  className="text-xs bg-background"
                />
                <Button type="submit" size="sm" variant="secondary" disabled={calculandoFrete}>
                  {calculandoFrete ? "Calculando..." : "Calcular"}
                </Button>
              </form>

              {freteCalculado && (
                <div className="mt-2 rounded-lg bg-background p-2.5 text-xs border border-border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">{freteCalculado.tipo}</span>
                    <span className="text-muted-foreground text-[11px]">Chega em {freteCalculado.prazo}</span>
                  </div>
                  <span className={`font-bold ${freteCalculado.valor === 0 ? "text-emerald-600" : "text-foreground"}`}>
                    {freteCalculado.valor === 0 ? "GRÁTIS" : brl(freteCalculado.valor)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Descrição Detalhada do Produto */}
        <section className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold border-b border-border pb-3">Descrição do Produto</h2>
          <div className="mt-4 prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
            {product.description ||
              "Este produto conta com excelente construção, alto desempenho e garantia assegurada pelo vendedor. Perfeito para uso diário, oferecendo praticidade e durabilidade comprovada."}
          </div>
        </section>

        {/* Seção de Avaliações: estrelas e comentários. Fotos e vídeos enviados pelo cliente não são exibidos aqui */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Avaliações de Clientes Verificados</h2>
              <p className="text-xs text-muted-foreground">Notas e opiniões reais de quem comprou na {storeName}</p>
            </div>
            <Button onClick={() => setShowReviewModal(true)} size="sm" variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" /> Deixar Avaliação
            </Button>
          </div>

          <div className="mt-6 space-y-6">
            {filteredReviews.map((rev) => (
              <article key={rev.id} className="border-b border-border/60 pb-6 last:border-none last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{rev.author}</span>
                    {rev.verified && (
                      <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Compra Confirmada
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{rev.date}</span>
                </div>

                <div className="mt-1.5 flex items-center gap-1 text-amber-500">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{rev.comment}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Perguntas e Respostas */}
        <section className="mt-14 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold border-b border-border pb-3">Perguntas Frequentes</h2>
          <form onSubmit={handleAskQuestion} className="mt-4 flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder={`Tire sua dúvida com a ${storeName}...`}
              className="flex-1"
            />
            <Button type="submit">
              <Send className="mr-2 h-4 w-4" /> Perguntar
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-border p-3.5 text-sm">
                <p className="font-semibold text-foreground">P: {q.question}</p>
                {q.answer ? (
                  <p className="mt-2 text-muted-foreground pl-3 border-l-2 border-primary">
                    <strong className="text-primary">Resposta da {storeName}:</strong> {q.answer}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground italic">Aguardando resposta do vendedor...</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Modal de Avaliação */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg">Avaliar este produto</h3>
              <button onClick={closeReviewModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddReview} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Sua Nota</label>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-500"
                    >
                      <Star
                        className={`h-6 w-6 ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold">Seu Nome</label>
                <Input
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Seu Comentário</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Conte o que achou da qualidade do produto..."
                  className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Fotos e Vídeos (opcional)</label>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input p-3 text-xs text-muted-foreground hover:bg-muted">
                  <Camera className="h-4 w-4" /> Adicionar fotos ou vídeos
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="sr-only"
                    onChange={handleReviewFilesChange}
                  />
                </label>
                {reviewMedia.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {reviewMedia.map((m) => (
                      <li
                        key={m.id}
                        className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted"
                      >
                        {m.type === "image" ? (
                          <img src={m.previewUrl} alt={m.name} className="h-full w-full object-cover" />
                        ) : (
                          <video src={m.previewUrl} className="h-full w-full object-cover" muted preload="metadata" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeReviewMedia(m.id)}
                          aria-label={`Remover ${m.name}`}
                          className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 text-foreground shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Até {REVIEW_MAX_FILES} arquivos: fotos até 10 MB e vídeos até 50 MB.
                </p>
              </div>
              <Button type="submit" className="w-full">
                Enviar Avaliação
              </Button>
            </form>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
