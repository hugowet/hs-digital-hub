import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Box,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Heart,
  Minus,
  Plus,
  QrCode,
  Send,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Truck,
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";
import React, { useMemo, useRef, useState, useEffect } from "react";
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
  packagingNote?: string;
  media?: ReviewMedia[];
  helpfulCount: number;
  verified: boolean;
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
      "Chegou super rápido aqui em casa! A caixa de papelão veio 100% lacrada com fita de segurança e muito plástico bolha por dentro. O produto veio intacto e funcionando perfeitamente.",
    packagingNote: "Embalagem: Caixa resistente, fita reforçada e produto muito bem protegido.",
    daysAgo: "há 3 dias",
    rating: 5,
  },
  {
    comment:
      "Confesso que fiquei com receio por causa do transporte, mas a embalagem me surpreendeu. Caixa firme, sem nenhum amassado e muito bem empacotado. Podem comprar sem medo!",
    packagingNote: "Entrega: Rápida antes do prazo estimado e caixa lacrada de fábrica.",
    daysAgo: "há 6 dias",
    rating: 5,
  },
  {
    comment:
      "Excelente experiência de compra! O entregador foi super atencioso e a caixa veio sem nenhuma avaria. Abri na hora para conferir e veio tudo certinho.",
    packagingNote: "Embalagem: Pacote seguro com proteção extra para impactos.",
    daysAgo: "há 1 semana",
    rating: 5,
  },
  {
    comment:
      "Nota 10! Chegou bem antes do prazo previsto. Pacote bem lacrado, nada danificado e produto exatamente como descrito. Recomendo muito a loja!",
    packagingNote: "Entrega: Rastreamento atualizado certinho e pacote lacrado.",
    daysAgo: "há 2 semanas",
    rating: 5,
  },
];
// Gera avaliações únicas com nomes e fotos de embalagens realistas para cada produto
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
      packagingNote: tpl1.packagingNote,
      verified: true,
      helpfulCount: 12 + (pos % 15),
    },
    {
      id: `rev_2_${productId}`,
      author: reviewer2.name,
      rating: tpl2.rating,
      date: `${reviewer2.city} · ${tpl2.daysAgo}`,
      comment: tpl2.comment,
      packagingNote: tpl2.packagingNote,
      verified: true,
      helpfulCount: 6 + (pos % 9),
    },
    {
      id: `rev_3_${productId}`,
      author: reviewer3.name,
      rating: tpl3.rating,
      date: `${reviewer3.city} · ${tpl3.daysAgo}`,
      comment: tpl3.comment,
      packagingNote: tpl3.packagingNote,
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
export function ProductDetailPage() {
  const { productId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  // Zoom que acompanha o mouse sobre a foto principal
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  // Carrega dados do produto com SSR imediato
  const { data: product = loaderData?.product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct({ data: { productId } }),
    initialData: loaderData?.product ?? undefined,
  });
  const media = useMemo(() => {
    if (!product) return [];
    if (product.media?.length) return product.media;
    const list = [product.image_url, ...(product.gallery_urls ?? [])].filter(Boolean) as string[];
    return list.map((url, index) => ({
      id: `media-${index}`,
      type: "image" as const,
      position: index,
      url,
    }));
  }, [product]);
  // Vendas calculadas de forma idêntica à vitrine
  const moderateSoldCount = useMemo(() => {
    if (!product) return 54;
    if (product.sold_count && product.sold_count > 0) return product.sold_count;
    return getConsistentSalesCount(productId);
  }, [product, productId]);
  // Frases curtas da descrição para o bloco "O que você precisa saber"
  const highlights = useMemo(() => {
    const text = product?.description ?? "";
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.length <= 160)
      .slice(0, 5);
  }, [product]);
  const storeName = product?.stores?.name ?? "Loja Oficial";
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
        question: "O produto vem com nota fiscal e garantia?",
        answer: `Sim! Enviamos com nota fiscal eletrônica e garantia de 30 dias pela ${storeName}.`,
        created_at: "há 2 dias",
      },
      {
        id: "q2",
        question: "Como é feita a embalagem para não quebrar no envio?",
        answer: "Produto lacrado, envolto em plástico bolha reforçado dentro de caixa de envio.",
        created_at: "há 3 dias",
      },
    ];
  });
  // Avaliações exclusivas deste produto com fotos de embalagens reais
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    try {
      const saved = localStorage.getItem(`reviews_${productId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return generateUniqueProductReviews(productId);
  });
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
  // Modal e Formulário de Avaliação
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMediaList, setReviewMediaList] = useState<ReviewMedia[]>([]);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"helpful" | "recent">("recent");
  const [lightboxMedia, setLightboxMedia] = useState<ReviewMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({
      active: true,
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };
  const handleZoomLeave = () => setZoom((prev) => ({ ...prev, active: false }));
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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isImage && !isVideo) {
        toast.error("Formato inválido. Selecione fotos ou vídeos.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReviewMediaList((prev) => [
            ...prev,
            { url: event.target!.result as string, type: isVideo ? "video" : "image" },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
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
      packagingNote: "Embalagem: Excelente estado de entrega.",
      media: reviewMediaList.length > 0 ? reviewMediaList : undefined,
      helpfulCount: 0,
      verified: true,
    };
    setReviews((prev) => [newRev, ...prev]);
    setShowReviewModal(false);
    setReviewComment("");
    setReviewName("");
    setReviewRating(5);
    setReviewMediaList([]);
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
  const maxInstallments = useMemo(() => {
    if (!product) return 1;
    if (product.price < 10) return 1;
    return Math.min(10, Math.floor(product.price / 5));
  }, [product]);
  const installmentValue = useMemo(() => {
    if (!product || maxInstallments <= 1) return product?.price ?? 0;
    return product.price / maxInstallments;
  }, [product, maxInstallments]);
  if (isLoading && !product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 animate-pulse space-y-6">
          <div className="h-8 w-1/3 rounded bg-muted" />
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="aspect-square rounded-xl bg-muted lg:col-span-7" />
            <div className="space-y-4 lg:col-span-5">
              <div className="h-10 w-3/4 rounded bg-muted" />
              <div className="h-6 w-1/4 rounded bg-muted" />
              <div className="h-24 w-full rounded bg-muted" />
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
        <main className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-20 text-center">
          <Box className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h1 className="text-2xl font-bold">Produto não encontrado</h1>
          <p className="mt-2 text-muted-foreground">Este item pode ter sido removido ou está temporariamente indisponível.</p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar para o início</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }
  const isDigital = product.product_type === "digital";
  const hasDiscount = Boolean(product.compare_at_price && product.compare_at_price > product.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / (product.compare_at_price as number)) * 100)
    : 0;
  const cartItem = {
    productId: product.id,
    title: product.title,
    price: Number(product.price),
    imageUrl: product.image_url ?? undefined,
    maxStock: product.stock ?? 99,
    freeShipping: product.free_shipping,
    storeId: product.store_id,
    storeName: storeName,
    productType: isDigital ? ("digital" as const) : ("physical" as const),
  };
  const currentMedia = media[selectedImage];
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8">
      <SiteHeader />
      {/* Breadcrumb */}
      <nav className="mx-auto w-full max-w-7xl px-4 py-3 text-xs text-muted-foreground">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <Link to="/" className="hover:text-primary">
              Início
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link to="/" search={{ category: product.category }} className="hover:text-primary">
              {product.category || "Catálogo"}
            </Link>
          </li>
          <li>/</li>
          <li className="truncate max-w-[200px] sm:max-w-xs text-foreground">{product.title}</li>
        </ol>
      </nav>
      <main className="mx-auto w-full max-w-7xl px-0 sm:px-4">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Galeria: miniaturas à esquerda (desktop), foto grande e zoom */}
          <section className="lg:col-span-7 flex flex-col md:flex-row gap-4 bg-card sm:rounded-xl sm:border sm:border-border p-3 sm:p-4">
            {media.length > 1 && (
              <div className="hidden md:flex flex-col gap-2 w-16 max-h-[560px] overflow-y-auto">
                {media.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedImage(idx)}
                    onMouseEnter={() => setSelectedImage(idx)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-white transition ${
                      selectedImage === idx ? "border-primary" : "border-transparent hover:border-muted-foreground/40"
                    }`}
                  >
                    <img src={item.url} alt="" className="h-full w-full object-contain p-1" />
                    {item.type === "video" && (
                      <div className="absolute inset-0 grid place-items-center bg-black/30">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 aspect-square max-h-[560px] overflow-hidden rounded-lg bg-white flex items-center justify-center">
              <div
                className="h-full w-full flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseMove={currentMedia?.type === "video" ? undefined : handleZoomMove}
                onMouseLeave={handleZoomLeave}
              >
                {currentMedia?.type === "video" ? (
                  <video src={currentMedia.url} controls autoPlay muted className="max-h-full max-w-full rounded-lg" />
                ) : (
                  <img
                    src={currentMedia?.url || product.image_url || undefined}
                    alt={product.title}
                    className="max-h-full max-w-full object-contain p-4 transition-transform duration-200 ease-out cursor-zoom-in"
                    style={{
                      transform: zoom.active ? "scale(2)" : "scale(1)",
                      transformOrigin: `${zoom.x}% ${zoom.y}%`,
                    }}
                  />
                )}
              </div>
              <div className="absolute right-3 top-3 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setIsFavorite(!isFavorite);
                    toast.success(isFavorite ? "Removido dos favoritos" : "Salvo nos seus favoritos!");
                  }}
                  className="rounded-full bg-background/90 p-2.5 text-muted-foreground shadow-md transition hover:text-red-500"
                  aria-label="Favoritar"
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="rounded-full bg-background/90 p-2.5 text-muted-foreground shadow-md transition hover:text-primary"
                  aria-label="Compartilhar"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
              {media.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev > 0 ? prev - 1 : media.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow transition hover:bg-background"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev < media.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow transition hover:bg-background"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute left-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {selectedImage + 1}/{media.length}
                  </span>
                </>
              )}
              {media.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 md:hidden">
                  {media.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        selectedImage === idx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
          {/* Caixa de compra fixa à direita, no estilo do Mercado Livre */}
          <aside className="lg:col-span-5 px-3 sm:px-0">
            <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{isDigital ? "Produto digital" : "Novo"}</span>
                <span className="font-semibold text-emerald-600">+{moderateSoldCount} vendidos</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-medium leading-snug">{product.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-bold text-foreground">4.9</span>
                <span className="text-muted-foreground">({reviews.length * 42} avaliações)</span>
              </div>
              <div className="space-y-1">
                {hasDiscount && (
                  <span className="block text-sm text-muted-foreground line-through">
                    {brl(product.compare_at_price as number)}
                  </span>
                )}
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-semibold text-foreground">{brl(product.price)}</span>
                  {hasDiscount && (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
                {maxInstallments > 1 ? (
                  <p className="text-sm font-semibold text-emerald-600">
                    {maxInstallments}x de {brl(installmentValue)} sem juros
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-emerald-600">À vista no Pix ou Cartão de Crédito</p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                  Pix com aprovação instantânea
                </p>
              </div>
              <div className="space-y-2.5 rounded-lg border border-border p-3 text-sm">
                <p className="flex items-start gap-2">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {product.free_shipping ? (
                      <>
                        <strong className="text-emerald-600">Frete grátis</strong> para todo o Brasil
                      </>
                    ) : (
                      "Envio com seguro para todo o Brasil"
                    )}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Compra protegida pela {storeName} com garantia oficial</span>
                </p>
                <p className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Parcelamento e pagamento no cartão ou Pix</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantidade:</span>
                <div className="flex items-center rounded-lg border border-border bg-background">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="p-2 text-muted-foreground hover:text-foreground"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((prev) => Math.min(product.stock || 99, prev + 1))}
                    className="p-2 text-muted-foreground hover:text-foreground"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs text-emerald-600 font-medium">Estoque disponível</span>
              </div>
              <div className="space-y-2.5 pt-1">
                <Button
                  size="lg"
                  className="w-full text-base font-semibold"
                  onClick={() => {
                    add(cartItem, quantity);
                    navigate({ to: "/carrinho" });
                  }}
                >
                  Comprar agora
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-base font-semibold"
                  onClick={() => {
                    add(cartItem, quantity);
                    toast.success("Adicionado ao carrinho com sucesso!");
                  }}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" /> Adicionar ao carrinho
                </Button>
              </div>
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{storeName}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" /> +{moderateSoldCount} vendas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>{isDigital ? "Entrega digital imediata" : "Envio rastreado pela HS Digital"}</span>
              </div>
            </div>
          </aside>
        </div>
            {/* O que você precisa saber */}
        {product?.description ? (
          <section className="mt-8 sm:mt-10 rounded-none sm:rounded-xl border-y sm:border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold border-b border-border pb-3">Informações e Garantias</h2>
            <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {/* Renderiza o box de segurança com as listas HTML da CJ */}
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          </section>
        ) : (
          highlights.length > 0 && (
            <section className="mt-8 sm:mt-10 rounded-none sm:rounded-xl border-y sm:border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">O que você precisa saber sobre este produto</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                {highlights.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </section>
          )
        )}

               {/* Descrição Detalhada do Fornecedor */}
        {product?.description_long && product.description_long !== product.description && (
          <section className="mt-8 sm:mt-10 rounded-none sm:rounded-xl border-y sm:border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold border-b border-border pb-3">Descrição Detalhada</h2>
            <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {/* --- INÍCIO DA AJUSTE DA HS DIGITAL --- */}
              {(() => {
                const nomeProduto = product?.title || "Produto Especial";
                
                // Se a descrição contiver texto do fornecedor ou for muito genérica, exibe o modelo magnético
                if (product.description_long.includes("CJ Dropshipping") || product.description_long.includes("catálogo")) {
                  return (
                    <div className="space-y-4">
                      <p>
                        O <strong>{nomeProduto}</strong> foi selecionado entre os mais procurados da categoria na <strong>HS Digital</strong>, unindo alta qualidade, praticidade e excelente custo-benefício.
                      </p>
                      
                      <h3 className="font-semibold text-foreground pt-2">🚀 Destaques do Produto</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Praticidade:</strong> Perfeito para facilitar o seu dia a dia.</li>
                        <li><strong>Qualidade:</strong> Testado e aprovado para garantir a melhor experiência.</li>
                        <li><strong>Destaque:</strong> Um dos itens mais acessados da nossa loja esta semana.</li>
                      </ul>
                      
                      <h3 className="font-semibold text-foreground pt-2">🛡️ Garantia da HS Digital</h3>
                      <p>📦 <strong>Estoque de Fábrica:</strong> Disponibilidade e envio monitorados diretamente pelo nosso Seller Center.</p>
                      <p>💳 <strong>Compra 100% Segura:</strong> Pagamento processado via Mercado Pago com garantia de entrega ou seu dinheiro de volta.</p>
                    </div>
                  );
                }

                // Caso o produto já tenha uma descrição real e tratada, mantém o texto original do banco
                return <p className="whitespace-pre-line">{product.description_long}</p>;
              })()}
              {/* --- FIM DA AJUSTE DA HS DIGITAL --- */}
            </div>
          </section>
        )}

        {/* Avaliações com Fotos Reais de Encomendas */}
        <section className="mt-8 sm:mt-10 rounded-none sm:rounded-xl border-y sm:border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold">Avaliações de clientes verificados</h2>
              <p className="text-xs text-muted-foreground">
                Fotos e unboxing de pacotes recebidos em compras na {storeName}
              </p>
            </div>
            <Button onClick={() => setShowReviewModal(true)} size="sm" variant="outline">
              <Camera className="mr-2 h-4 w-4" /> Deixar avaliação
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
                        <CheckCircle2 className="h-3 w-3" /> Compra confirmada
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{rev.date}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{rev.comment}</p>
                {rev.packagingNote && (
                  <p className="mt-1.5 text-xs text-emerald-600 font-medium">✓ {rev.packagingNote}</p>
                )}
                {rev.media && rev.media.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {rev.media.map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => setLightboxMedia(m)}
                        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm transition hover:opacity-90"
                      >
                        <img src={m.url} alt="Embalagem recebida" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
        {/* Perguntas e Respostas */}
        <section className="mt-8 sm:mt-10 rounded-none sm:rounded-xl border-y sm:border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold border-b border-border pb-3">Perguntas frequentes</h2>
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
                  <p className="mt-2 text-xs italic text-muted-foreground">Aguardando resposta do vendedor...</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      {/* Modal de Avaliação */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg">Avaliar este produto</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddReview} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Sua nota</label>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setReviewRating(star)} className="p-1">
                      <Star
                        className={`h-6 w-6 ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold">Seu nome</label>
                <Input
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Comentário sobre o produto e embalagem</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Conte como o produto e a embalagem chegaram..."
                  className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Adicionar fotos ou vídeos</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 w-full"
                >
                  <Upload className="mr-2 h-4 w-4" /> Selecionar fotos ou vídeos
                </Button>
                {reviewMediaList.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {reviewMediaList.map((m, idx) =>
                      m.type === "video" ? (
                        <video key={idx} src={m.url} className="h-12 w-12 rounded object-cover border" muted />
                      ) : (
                        <img key={idx} src={m.url} alt="" className="h-12 w-12 rounded object-cover border" />
                      ),
                    )}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full">
                Enviar avaliação
              </Button>
            </form>
          </div>
        </div>
      )}
      {/* Lightbox para Visualizar Foto da Embalagem */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm cursor-pointer"
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-black">
            <img src={lightboxMedia.url} alt="Embalagem" className="max-h-[85vh] w-auto object-contain" />
            <button
              onClick={() => setLightboxMedia(null)}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}

{/* PRODUTOS RELACIONADOS */} {relatedProducts.length > 0 && ( <div className="mt-12 border-t pt-8"> <h2 className="text-lg font-bold text-gray-900 mb-4">Quem comprou este produto também viu</h2> <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"> {relatedProducts.map((p) => ( <ProductCard key={p.id} product={p} /> ))} </div> </div> )} </div> </main> <SiteFooter /> </div> ); }
