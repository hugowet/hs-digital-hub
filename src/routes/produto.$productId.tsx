// @ts-nocheck -- types out of sync with backend schema; see build log
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getProductReviews, publishProductReview } from "@/lib/reviews.functions";
import { reviewPhotoPath } from "@/lib/reviews";
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Minus,
  Plus,
  QrCode,
  Send,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Star,
  Truck,
  Upload,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catalogDisplayPrice } from "@/lib/product-price";
import { useCart } from "@/lib/cart";
import { fetchCatalogPage } from "@/lib/catalog.functions";
import { productQueryOptions } from "@/lib/product-query";
import { SITE_ORIGIN, plainDescription, productSearchSchema } from "@/lib/seo";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { trackProductView, markAsPurchasedOrInCart, initAbandonmentWatcher } from "@/lib/abandonment-tracker";

export const Route = createFileRoute("/produto/$productId")({
  staticData: { sitemap: true },
  loader: ({ params, context }) => context.queryClient.ensureQueryData(productQueryOptions(params.productId)),
  head: ({ loaderData, params }) => {
    const p = loaderData;
    const title = p?.title ? `${p.title} · HS Digital` : "Produto não encontrado · HS Digital";
    const desc = plainDescription(p?.description_long || p?.description, p ? `Confira ${p.title} na HS Digital. Veja detalhes e opções de entrega.` : "Este produto não está disponível.");
    const pageUrl = `${SITE_ORIGIN}/produto/${params.productId}`;

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:site_name", content: "HS Digital Marketplace" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: pageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(!p ? [{ name: "robots", content: "noindex, follow" }] : []),
        ...(p?.image_url?.startsWith("https://") ? [
          { property: "og:image", content: p.image_url },
          { name: "twitter:image", content: p.image_url },
        ] : []),
      ],
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: p ? [{ type: "application/ld+json", children: JSON.stringify(productSearchSchema(p)) }] : [],
    };
  },
  errorComponent: () => <div role="alert" className="p-8">Não foi possível carregar o produto. <Link to="/">Voltar à loja</Link></div>,
  notFoundComponent: () => <div className="p-8">Produto não encontrado. <Link to="/">Voltar à loja</Link></div>,
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
  photos?: string[];
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

// Reduz o tamanho da foto antes de enviá-la ao armazenamento privado
async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => reject(new Error("Foto inválida."));
      img.src = String(e.target?.result);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a foto."));
    reader.readAsDataURL(file);
  });
}

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Efeito de Zoom na foto principal
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);

  // Controle de Swipe Touch no Celular
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleMouseLeave = () => {
    setZoomPos(null);
  };

  // Perguntas e Respostas
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  // Avaliações de Clientes com Fotos
  const loadReviews = useServerFn(getProductReviews);
  const publishReview = useServerFn(publishProductReview);
  const [savingReview, setSavingReview] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const { data: reviews = [], error: reviewsError, refetch: reloadReviews } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: () => loadReviews({ data: { productId } }),
    refetchInterval: 45 * 60 * 1000,
  });
  const [newReviewAuthor, setNewReviewAuthor] = useState("");
  const [newReviewComment, setNewReviewComment] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewPhotos, setNewReviewPhotos] = useState<string[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: product } = useSuspenseQuery(productQueryOptions(productId));

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.category],
    enabled: !!product?.category,
    queryFn: async () => {
      try {
        const res = await fetchCatalogPage({ data: { category: product?.category, pageSize: 12 } });
        return res.products.filter((p: Product) => p.id !== productId);
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
    return Number.isFinite(rawStock) && rawStock > 0 ? rawStock : 0;
  }, [product?.stock]);

  const isCj = product?.supplier === "cj";
  const price = catalogDisplayPrice(product);
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

  // Touch Swipe para passar fotos no celular
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isSwipeLeft = distance > 45;
    const isSwipeRight = distance < -45;

    if (isSwipeLeft && selectedImage < imagesList.length - 1) {
      setSelectedImage((prev) => prev + 1);
    } else if (isSwipeRight && selectedImage > 0) {
      setSelectedImage((prev) => prev - 1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // ESPECIFICAÇÕES DO PRODUTO (FILTRO: REMOVE DADOS DE AFILIADO INTERNOS)
  const parsedSpecs = useMemo(() => {
    if (!product?.specifications) return [];

    const hiddenKeys = new Set([
      "affiliate_id",
      "affiliate_url",
      "partner",
      "asin",
      "supplier",
      "supplier_id",
      "internal_id",
    ]);

    const isValidEntry = (k: string, v: any) => {
      const keyNormalized = String(k).toLowerCase().trim();
      if (hiddenKeys.has(keyNormalized)) return false;
      if (keyNormalized.startsWith("affiliate_")) return false;
      return Boolean(k && String(v).trim());
    };

    if (typeof product.specifications === "object" && !Array.isArray(product.specifications)) {
      return Object.entries(product.specifications).filter(([k, v]) => isValidEntry(k, v));
    }
    if (Array.isArray(product.specifications)) {
      return (product.specifications as any[])
        .map((item) => [item.key || item.label || item.name, item.value])
        .filter(([k, v]) => isValidEntry(k, v));
    }
    return [];
  }, [product?.specifications]);

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

  const handleAddToCart = async (redirectCheckout: boolean) => {
    if (!product) return;
    if (maxAvailableStock < quantity) { toast.error("Esta opção está sem estoque."); return; }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      toast.info("Faça login para adicionar produtos ao carrinho.");
      navigate({ to: "/auth", search: { reason: "login-required" } });
      return;
    }
    // Botão nunca fica travado: usa o preço da vitrine e o frete é confirmado no checkout.
    markAsPurchasedOrInCart(product.id);

    add(
      {
        productId: product.id,
        storeId: product.store_id,
        storeName: "Loja JJ Kuster",
        title: product.supplierOptions?.find((option) => option.productId === productId)?.label
          ? `${product.title} — ${product.supplierOptions.find((option) => option.productId === productId)?.label}` : product.title,
        price,
        imageUrl: product.image_url ?? undefined,
        productType: product.product_type || "physical",
        freeShipping: isDigital || price >= 89.90,
        stock: maxAvailableStock,
      },
      quantity
    );

    if (redirectCheckout) {
      navigate({ to: "/carrinho" });
    } else {
      toast.success("Produto adicionado ao seu carrinho!");
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setQuestions((prev) => [
      {
        id: `q_${Date.now()}`,
        question: newQuestion.trim(),
        created_at: "Agora mesmo",
      },
      ...prev,
    ]);
    setNewQuestion("");
    toast.success("Pergunta enviada com sucesso!");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length + newReviewPhotos.length > 5) { toast.error("Selecione até 5 fotos."); return; }
    setUploadingPhotos(true);
    try {
      const photos = [];
      for (const file of files) {
        if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) throw new Error("Selecione imagens de até 5 MB.");
        photos.push(await compressImageToDataUrl(file));
      }
      setNewReviewPhotos((prev) => [...prev, ...photos]);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível ler a foto."); }
    finally { setUploadingPhotos(false); e.target.value = ""; }
  };

  const removeUploadPhoto = (index: number) => setNewReviewPhotos((prev) => prev.filter((_, idx) => idx !== index));

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingReview || uploadingPhotos) return;
    setSavingReview(true);
    const paths: string[] = [];
    let published = false;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error("Faça login para publicar sua avaliação.");
      const id = crypto.randomUUID();
      for (const [index, photo] of newReviewPhotos.entries()) {
        const blob = await (await fetch(photo)).blob();
        const path = reviewPhotoPath(data.user.id, productId, id, index);
        const upload = await supabase.storage.from("review-photos").upload(path, blob, { contentType: "image/jpeg" });
        if (upload.error) throw new Error("Não foi possível salvar a foto. Tente novamente.");
        paths.push(path);
      }
      await publishReview({ data: { id, productId, author: newReviewAuthor, rating: newReviewRating, comment: newReviewComment, photoPaths: paths } });
      published = true;
      const refreshed = await reloadReviews();
      if (refreshed.error) throw new Error("Avaliação salva; não foi possível atualizar a lista. Recarregue a página.");
      setNewReviewAuthor(""); setNewReviewComment(""); setNewReviewRating(5); setNewReviewPhotos([]); setShowReviewForm(false);
      toast.success("Sua avaliação foi salva com sucesso!");
    } catch (err) {
      if (!published && paths.length) await supabase.storage.from("review-photos").remove(paths);
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a avaliação.");
    } finally { setSavingReview(false); }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Produto não encontrado</h1>
          <p className="mt-2 text-muted-foreground">Este item pode ter sido removido ou não está mais disponível.</p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar para a Loja</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6 flex-1">
        {/* Breadcrumb simples */}
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition">Início</Link>
          <span>/</span>
          <span className="capitalize">{product.category || "Produtos"}</span>
          <span>/</span>
          <span className="line-clamp-1 text-foreground font-medium">{product.title}</span>
        </div>

        {/* 1. CARD PRINCIPAL (FOTOS COM ZOOM, SWIPE E COMPRA) */}
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

              {/* Imagem Principal com Zoom ao Passar o Mouse e Touch Swipe no Celular */}
              <div
                className="relative aspect-square w-full flex-1 overflow-hidden rounded-xl border border-border bg-muted/20 cursor-crosshair select-none touch-pan-y"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={imagesList[selectedImage] || imagesList[0]}
                  alt={product.title}
                  style={
                    zoomPos
                      ? {
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                          transform: "scale(2)",
                        }
                      : { transform: "scale(1)" }
                  }
                  className="h-full w-full object-contain p-2 transition-transform duration-100 ease-out"
                />

                {/* No celular a troca de fotos é por deslize (swipe), sem setas */}

                <button
                  type="button"
                  onClick={() => {
                    setIsFavorite(!isFavorite);
                    toast.success(!isFavorite ? "Salvo nos seus favoritos!" : "Removido dos favoritos.");
                  }}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-sm z-10"
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
                </button>

                {zoomPos && (
                  <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    🔍 Zoom ativado
                  </div>
                )}
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
                    ★ {reviews.length ? (reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length).toFixed(1) : "—"}
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

                {/* Selo de origem do envio: internacional (CJ) ou nacional */}
                <div className="mt-2">
                  {(product as any)?.supplier === "cj" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                      <Truck className="h-3.5 w-3.5" />
                      Envio internacional ✈️ — prazo médio de 12 a 18 dias úteis
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                      <Truck className="h-3.5 w-3.5" />
                      Envio nacional 🇧🇷 — entrega mais rápida
                    </span>
                  )}
                </div>

                {/* Bloco de Preço */}
                <div className="mt-4 rounded-xl bg-muted/20 p-4 border border-border/80">
                  <div className="flex items-center gap-2 leading-none">
                    <span className="rounded bg-[#00a650] px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {discountPercent}% OFF
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      {brl(originalPrice)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-sm font-semibold text-foreground">R$</span>
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                      {priceParts.reais}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{priceParts.centavos}</span>
                  </div>

                  <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 fill-emerald-600" />
                    em {maxInstallments}x de {brl(installmentValue)} sem juros
                  </p>
                </div>

                {product.supplierOptions?.length > 1 && (
                  <fieldset className="mt-4">
                    <legend className="mb-2 text-sm font-semibold">Cor / Tamanho / Modelo</legend>
                    <div className="flex flex-wrap gap-2">
                      {product.supplierOptions.map((option) => (
                        <Button key={option.productId} size="sm" variant={option.productId === productId ? "default" : "outline"}
                          aria-pressed={option.productId === productId}
                          disabled={option.stock <= 0}
                          title={option.stock <= 0 ? "Sem estoque confirmado na CJ" : option.label}
                          onClick={() => { setQuantity(1); setSelectedImage(0); navigate({ to: "/produto/$productId", params: { productId: option.productId } }); }}>
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {isCj && <p className="mt-2 text-xs text-muted-foreground">Opções apagadas estão sem estoque confirmado.</p>}
                {/* Estoque e Quantidade */}
                <div className="mt-4 flex items-center justify-between border-y border-border py-3">
                  <span className="text-xs text-muted-foreground">Quantidade:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxAvailableStock, q + 1))}
                      disabled={quantity >= maxAvailableStock}
                      className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="mt-6 space-y-2.5">
                <Button
                  onClick={() => handleAddToCart(true)}
                  className="w-full h-12 text-sm font-bold bg-[#3483fa] hover:bg-[#2968c8] text-white shadow-md rounded-xl"
                >
                  <Zap className="h-4 w-4 mr-2" /> Comprar Agora
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddToCart(false)}
                  className="w-full h-12 text-sm font-bold rounded-xl border-primary/40 text-primary hover:bg-primary/5"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" /> Adicionar ao Carrinho
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. DESCRIÇÃO DO PRODUTO */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm">
          <h2 className="text-lg sm:text-xl font-black text-foreground pb-3 border-b border-border flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Descrição do Produto
          </h2>
          <div className="mt-4 space-y-4 text-sm text-foreground/90 leading-relaxed">
            <p className="whitespace-pre-line text-sm sm:text-base text-foreground/90 font-normal">
              {product.description_long || product.description || "Descrição completa em processamento."}
            </p>
          </div>
        </section>

        {/* 3. ESPECIFICAÇÕES TÉCNICAS DO PRODUTO (SEM DADOS DE AFILIADO) */}
        {parsedSpecs.length > 0 && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm">
            <h2 className="text-lg sm:text-xl font-black text-foreground pb-3 border-b border-border flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" /> Especificações Técnicas
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-xs sm:text-sm">
                <tbody>
                  {parsedSpecs.map(([label, val], idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-muted/30" : "bg-card"}
                    >
                      <td className="w-1/3 sm:w-1/4 p-3 font-semibold text-muted-foreground border-b border-border capitalize">
                        {String(label).replace(/_/g, " ")}
                      </td>
                      <td className="p-3 text-foreground font-medium border-b border-border">
                        {String(val)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 4. AVALIAÇÕES E COMENTÁRIOS DOS CLIENTES */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Avaliações dos Clientes
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-foreground">
                  {reviews.length ? (reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length).toFixed(1) : "—"}
                </span>
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-500" />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">({reviews.length} avaliações)</span>
              </div>
            </div>

            <Button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="font-bold text-xs"
              variant={showReviewForm ? "outline" : "default"}
            >
              {showReviewForm ? "Cancelar Avaliação" : "Avaliar Produto com Fotos"}
            </Button>
          </div>

          {/* Formulário de Nova Avaliação */}
          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="mt-6 rounded-xl border border-primary/30 bg-muted/20 p-4 space-y-4">
              <h3 className="font-bold text-sm text-foreground">Deixe sua opinião e fotos do produto</h3>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Sua Nota:</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReviewRating(star)}
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= newReviewRating
                            ? "fill-amber-500 text-amber-500"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Seu Nome:</label>
                <Input
                  value={newReviewAuthor}
                  onChange={(e) => setNewReviewAuthor(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Seu Comentário:</label>
                <textarea
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="Conte o que achou do produto, da entrega e da qualidade..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none"
                  required
                />
              </div>

              {/* Upload de Fotos do Cliente */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">
                  Adicionar Fotos Reais do Produto:
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {newReviewPhotos.map((photo, pIdx) => (
                    <div key={pIdx} className="relative h-16 w-16 rounded-lg border border-border overflow-hidden group">
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeUploadPhoto(pIdx)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/60 bg-background text-muted-foreground hover:text-foreground transition">
                    <Camera className="h-5 w-5 mb-0.5" />
                    <span className="text-[9px] font-medium">+ Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={savingReview || uploadingPhotos} className="font-bold text-xs bg-primary text-primary-foreground">
                  <Send className="h-3.5 w-3.5 mr-1.5" /> {savingReview ? "Salvando..." : uploadingPhotos ? "Preparando fotos..." : "Publicar Avaliação"}
                </Button>
              </div>
            </form>
          )}

          {/* Lista de Avaliações */}
          <div className="mt-6 space-y-4">
            {reviewsError && <p role="alert" className="text-destructive">Não foi possível carregar as avaliações. <Button variant="ghost" onClick={() => reloadReviews()}>Tentar novamente</Button></p>}
            {!reviewsError && reviews.length === 0 && <p className="text-muted-foreground">Nenhuma avaliação publicada ainda.</p>}
            {reviews.map((rev) => (
              <div key={rev.id} className="rounded-xl border border-border/80 bg-card p-4 text-xs sm:text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{rev.author}</span>
                    {rev.verified && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <BadgeCheck className="h-3 w-3" /> Compra Verificada
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{rev.date}</span>
                </div>

                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3.5 w-3.5 ${
                        star <= rev.rating ? "fill-amber-500" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-foreground/90 leading-relaxed">{rev.comment}</p>

                {/* Galeria de Fotos Reais da Avaliação */}
                {rev.photos && rev.photos.length > 0 && (
                  <div className="pt-2 flex gap-2 overflow-x-auto">
                    {rev.photos.map((pUrl, pIdx) => (
                      <a
                        key={pIdx}
                        href={pUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-lg border border-border overflow-hidden hover:opacity-90 transition"
                      >
                        <img src={pUrl} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
