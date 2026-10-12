import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ChevronRight,
  CreditCard,
  Heart,
  HelpCircle,
  Info,
  MapPin,
  MessageSquare,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  Star,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackAbandonedCart } from "@/lib/abandoned-cart";
import { useCart } from "@/lib/cart";
import { fetchProduct, fetchProducts } from "@/lib/catalog.functions";
import { brl, compact } from "@/lib/format";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";

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
    const desc = p?.description || "Confira todos os detalhes deste produto na HS Digital com entrega garantida e compra protegida.";
    const imageUrl = p?.image_url || "https://hs-digital-marck.lovable.app/__l5e/assets-v1/39fcaa1a-9680-41a5-9293-4e05e8dc7c2b/hs-digital-logo.png";
    const pageUrl = `https://hs-digital-marck.lovable.app/produto/${params.productId}`;

    return {
      meta: [
        { title },
        { name: "description", content: desc },

        // Metadados OpenGraph para WhatsApp, Facebook, Telegram
        { property: "og:site_name", content: "HS Digital Marketplace" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: pageUrl },
        { property: "og:image", content: imageUrl },
        { property: "og:image:secure_url", content: imageUrl },

        // Twitter Card
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

export function ProductDetailPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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
        answer: "Sim, todos os produtos possuem garantia de 30 dias do vendedor e comprovação de envio oficial.",
        created_at: "há 2 dias",
      },
      {
        id: "q2",
        question: "Qual o prazo para envio após o pagamento?",
        answer:
          "O envio é realizado em até 24h úteis após a confirmação. O código de rastreamento é enviado por e-mail.",
        created_at: "há 3 dias",
      },
    ];
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct({ data: { productId } }),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
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

  useEffect(() => {
    if (media.length > 0) {
      const nextIdx = (selectedImage + 1) % media.length;
      const nextImg = new Image();
      const nextUrl = media[nextIdx]?.url;
      if (nextUrl) nextImg.src = nextUrl;
    }
  }, [selectedImage, media]);

  useEffect(() => {
    try {
      localStorage.setItem(`questions_${productId}`, JSON.stringify(questions));
    } catch {}
  }, [questions, productId]);

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
      toast.success("Link do produto copiado com sucesso! Agora é só colar no WhatsApp.");
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
    toast.success("Pergunta enviada ao vendedor! Notificaremos quando for respondida.");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-10 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-32 w-full animate-pulse rounded bg-muted" />
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
            O produto que você está procurando pode ter sido desativado ou removido.
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition">Início</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="capitalize">{product.category || "Geral"}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate max-w-[200px] sm:max-w-xs font-medium text-foreground">
            {product.title}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Galeria de Fotos */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            {media.length > 1 && (
              <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto sm:max-h-[520px] pb-2 sm:pb-0 scrollbar-none">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedImage(index);
                      setImageLoaded(false);
                    }}
                    className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImage === index
                        ? "border-primary shadow-md"
                        : "border-border hover:border-muted-foreground/50 opacity-80"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            <div
              className="relative flex-1 aspect-square max-h-[540px] overflow-hidden rounded-3xl border border-border bg-card shadow-sm flex items-center justify-center select-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {currentMedia?.url ? (
                <img
                  src={currentMedia.url}
                  alt={product.title}
                  onLoad={() => setImageLoaded(true)}
                  className={`h-full w-full object-contain p-2 transition duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : (
                <div className="text-muted-foreground text-sm">Sem imagem disponível</div>
              )}

              {/* Botões de Ação na Imagem */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-full bg-background/80 p-2.5 text-foreground shadow backdrop-blur transition hover:bg-background hover:text-primary"
                  title="Compartilhar produto no WhatsApp"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFavorite(!isFavorite);
                    toast.success(isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos!");
                  }}
                  className={`rounded-full bg-background/80 p-2.5 shadow backdrop-blur transition ${
                    isFavorite ? "text-rose-500" : "text-foreground hover:text-rose-500"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
                </button>
              </div>

              {product.free_shipping && (
                <span className="absolute top-4 left-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white shadow">
                  FRETE GRÁTIS
                </span>
              )}
            </div>
          </div>

          {/* Bloco de Detalhes e Compra */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {isDigital ? "Produto Digital · Envio Imediato" : "Produto Físico · Envio Rastreado"}
                </span>
                {product.sold_count > 0 && (
                  <span className="text-xs text-muted-foreground">• {product.sold_count} vendidos</span>
                )}
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
                {product.title}
              </h1>

              {/* Avaliação */}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating || 5) ? "fill-current" : "opacity-30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-foreground">
                  {(product.rating || 5).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({product.reviews_count || 12} avaliações)
                </span>
              </div>

              {/* Preço e Parcelamento */}
              <div className="mt-5 rounded-2xl bg-muted/40 p-4 border border-border">
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <p className="text-xs text-muted-foreground line-through">
                    {brl(product.compare_at_price)}
                  </p>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-primary">
                    {brl(product.price)}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                    no Pix
                  </span>
                </div>
                {product.price >= 30 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ou em até {maxInstallments}x de {brl(installmentValue)} no cartão
                  </p>
                )}
              </div>

              {/* Botão Especial de Compartilhar */}
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="w-full border-primary/30 text-primary hover:bg-primary/5 font-bold flex items-center justify-center gap-2 h-10"
                >
                  <Share2 className="h-4 w-4" /> Compartilhar no WhatsApp com Foto
                </Button>
              </div>

              {/* Benefícios */}
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Compra 100% Protegida com garantia de entrega ou dinheiro de volta</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>Código de rastreamento oficial enviado para o seu e-mail</span>
                </div>
              </div>
            </div>

            {/* Ações de Compra */}
            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-muted-foreground hover:text-foreground transition"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm">{quantity}</span>
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
                  className="flex-1 font-bold h-12 text-sm"
                >
                  Adicionar ao Carrinho
                </Button>
              </div>

              <Button
                onClick={() => {
                  add(product, quantity);
                  navigate({ to: "/carrinho" });
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-12 text-base shadow-lg transition"
              >
                Comprar Agora
              </Button>
            </div>
          </div>
        </div>

        {/* Descrição e Especificações */}
        <section className="mt-12 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-black">Detalhes do Produto</h2>
          <div className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description_long || product.description || "Nenhuma descrição detalhada informada."}
          </div>
        </section>

        {/* Perguntas e Respostas */}
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black">Perguntas sobre o produto</h2>
          </div>

          <form onSubmit={handleAddQuestion} className="mt-4 flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Escreva sua dúvida sobre o produto..."
              className="flex-1 h-11"
            />
            <Button type="submit" className="font-bold h-11 px-5">
              <Send className="h-4 w-4 mr-1.5" /> Perguntar
            </Button>
          </form>

          <div className="mt-6 divide-y divide-border">
            {questions.map((q) => (
              <div key={q.id} className="py-4">
                <p className="text-sm font-bold text-foreground">P: {q.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">Enviada {q.created_at}</p>
                {q.answer && (
                  <div className="mt-2 rounded-xl bg-muted/50 p-3 text-xs text-foreground border-l-2 border-primary">
                    <span className="font-bold text-primary">Resposta do vendedor:</span> {q.answer}
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
