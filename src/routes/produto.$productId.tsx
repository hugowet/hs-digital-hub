import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  Heart,
  MessageSquare,
  Minus,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { fetchProduct, fetchProducts } from "@/lib/catalog.functions";
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
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: pageUrl },
        { property: "og:image", imageUrl },
        { property: "og:image:secure_url", imageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 sm:pb-8">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-3.5 py-3 sm:px-6 sm:py-6">
        {/* Breadcrumb Otimizado para Mobile */}
        <nav className="mb-3 sm:mb-5 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1">
          <Link to="/" className="hover:text-primary transition shrink-0">Início</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="capitalize shrink-0">{product.category || "Geral"}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-xs font-medium text-foreground">
            {product.title}
          </span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Coluna da Imagem e Galeria */}
          <div className="lg:col-span-7 flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
            {/* Foto Principal */}
            <div
              className="relative flex-1 aspect-square w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm flex items-center justify-center select-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {currentMedia?.url ? (
                <img
                  src={currentMedia.url}
                  alt={product.title}
                  onLoad={() => setImageLoaded(true)}
                  className={`h-full w-full object-contain transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : (
                <div className="text-muted-foreground text-sm">Sem imagem</div>
              )}

              {/* Botões Flutuantes no Topo da Imagem */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-full bg-white/90 p-2 text-foreground shadow-md backdrop-blur transition hover:text-primary"
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
                  className={`rounded-full bg-white/90 p-2 shadow-md backdrop-blur transition ${
                    isFavorite ? "text-rose-500" : "text-foreground hover:text-rose-500"
                  }`}
                  title="Favoritar"
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                </button>
              </div>

              {product.free_shipping && (
                <span className="absolute top-3 left-3 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
                  FRETE GRÁTIS
                </span>
              )}

              {/* Indicador de Imagem Atual no Celular */}
              {media.length > 1 && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                  {selectedImage + 1} / {media.length}
                </div>
              )}
            </div>

            {/* Miniaturas com Rolagem Suave no Mobile */}
            {media.length > 1 && (
              <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[500px] pb-1 sm:pb-0 scrollbar-none">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedImage(index);
                      setImageLoaded(false);
                    }}
                    className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImage === index
                        ? "border-primary shadow-sm"
                        : "border-border/80 opacity-70 hover:opacity-100"
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
          </div>

          {/* Coluna de Preço e Detalhes da Compra */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
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

              {/* Avaliação */}
              <div className="mt-2 flex items-center gap-1.5">
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
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

              {/* Caixa de Preço */}
              <div className="mt-4 rounded-2xl bg-muted/30 p-4 border border-border">
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <p className="text-xs text-muted-foreground line-through">
                    {brl(product.compare_at_price)}
                  </p>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-primary">
                    {brl(product.price)}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                    no Pix
                  </span>
                </div>
                {product.price >= 30 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ou em até {maxInstallments}x de {brl(installmentValue)} sem juros
                  </p>
                )}
              </div>

              {/* Garantias */}
              <div className="mt-4 space-y-2 rounded-xl bg-card p-3 border border-border text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Compra 100% Protegida com garantia e suporte</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>Envio com código de rastreamento oficial no e-mail</span>
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
        <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
          <h2 className="text-lg sm:text-xl font-black">Detalhes do Produto</h2>
          <div className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description_long || product.description || "Nenhuma descrição detalhada informada."}
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
      </main>

      {/* Barra Fixa de Compra Rápida no Mobile (estilo Shopee / Mercado Livre) */}
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
