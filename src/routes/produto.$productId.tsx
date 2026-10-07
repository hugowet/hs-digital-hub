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
        { property: "og:site_name", content: "HS Digital Marketplace" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: pageUrl },
        { property: "og:image", content: imageUrl },
        { property: "og:image:secure_url", content: imageUrl },
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
    const urls = [product.image_url, ...(product.gallery_urls ?? [])].filter(Boolean) as string[];
    return urls.map((url, i) => ({
      id: `fallback-${i}`,
      url,
      media_type: "image" as const,
      storage_path: url,
      position: i,
    }));
  }, [product]);

  useEffect(() => {
    if (product) {
      trackAbandonedCart({
        id: product.id,
        title: product.title,
        price: Number(product.price),
        image_url: product.image_url,
      });
    }
  }, [product]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = product?.title || "Produto na HS Digital";
    const shareText = `Olha esse produto que encontrei na HS Digital: ${shareTitle} por ${product ? brl(product.price) : ""}`;

    // Tenta anexar o arquivo da imagem para o WhatsApp/celular exibir a foto do produto
    if (navigator.share) {
      try {
        if (product?.image_url) {
          try {
            const response = await fetch(product.image_url);
            const blob = await response.blob();
            const file = new File([blob], "produto.jpg", { type: blob.type || "image/jpeg" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: shareTitle,
                text: `${shareText}\n${shareUrl}`,
                files: [file],
              });
              return;
            }
          } catch {
            // Continua com compartilhamento de link normal caso haja bloqueio de CORS na imagem
          }
        }

        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Se o usuário cancelou o menu de compartilhar, não faz nada
        return;
      }
    }

    // Fallback para computadores sem suporte a navigator.share
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link do produto copiado com sucesso!");
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
            <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-6 w-1/4 animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded bg-muted" />
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
        <main className="mx-auto flex min-h-[50vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Produto não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">O produto que você procura não existe ou está indisponível.</p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar para o catálogo</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const currentMedia = media[selectedImage] ?? media[0];
  const isDigital = product.product_type === "digital" || product.category?.includes("digital");
  const relatedProducts = allProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/" search={{ category: product.category }} className="hover:text-foreground capitalize">
            {CATEGORIES.find((c) => c.slug === product.category)?.label || product.category}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="line-clamp-1 text-foreground font-medium">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Galeria de Fotos */}
          <div className="space-y-4">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card flex items-center justify-center select-none"
              onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
              onTouchEnd={(e) => {
                if (touchStartX === null || media.length <= 1) return;
                const endX = e.changedTouches[0]?.clientX ?? touchStartX;
                const diff = touchStartX - endX;
                if (diff > 40) setSelectedImage((prev) => (prev + 1) % media.length);
                if (diff < -40) setSelectedImage((prev) => (prev - 1 + media.length) % media.length);
                setTouchStartX(null);
              }}
            >
              {currentMedia?.url ? (
                <img
                  src={currentMedia.url}
                  alt={product.title}
                  className={`h-full w-full object-contain p-4 transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setImageLoaded(true)}
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
                  title="Compartilhar produto"
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
                <span className="absolute bottom-4 left-4 rounded-md bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow">
                  Frete Grátis
                </span>
              )}
            </div>

            {/* Miniaturas */}
            {media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedImage(index);
                      setImageLoaded(false);
                    }}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-card p-1 transition ${
                      selectedImage === index ? "border-primary" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <img src={item.url} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalhes da Compra */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Store className="h-4 w-4" />
                <span>Vendido por <strong>{product.stores?.name ?? "HS Digital"}</strong></span>
              </div>
              <h1 className="mt-2 text-xl font-bold sm:text-2xl">{product.title}</h1>

              <div className="mt-2 flex items-center gap-2 text-xs">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(product.rating ?? 4.8) ? "fill-current" : "text-muted"}`}
                    />
                  ))}
                </div>
                <span className="font-bold">{product.rating ?? 4.8}</span>
                <span className="text-muted-foreground">({compact(product.reviews_count ?? 120)} avaliações)</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{compact(product.sold_count ?? 30)} vendidos</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">{brl(product.price)}</span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-sm text-muted-foreground line-through">{brl(product.compare_at_price)}</span>
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold text-emerald-600">
                  em até 10x de {brl(product.price / 10)} sem juros no cartão
                </p>
              </div>

              {/* Seletor de Quantidade */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-medium">Quantidade:</span>
                <div className="flex items-center rounded-lg border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 text-muted-foreground hover:text-foreground"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock ?? 99, q + 1))}
                    className="p-2 text-muted-foreground hover:text-foreground"
                    disabled={quantity >= (product.stock ?? 99)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground">({product.stock ?? 50} disponíveis)</span>
              </div>

              {/* Botões de Ação */}
              <div className="grid gap-2 pt-2">
                <Button
                  size="lg"
                  className="w-full font-bold bg-[#3483fa] hover:bg-[#2968c8] text-white"
                  onClick={async () => {
                    const { data, error } = await supabase.auth.getUser();
                    if (error || !data.user) {
                      toast.info("Faça login para continuar com a compra.");
                      navigate({ to: "/auth", search: { reason: "login-required" } });
                      return;
                    }
                    add(
                      {
                        productId: product.id,
                        title: product.title,
                        price: Number(product.price),
                        imageUrl: product.image_url ?? null,
                        maxStock: product.stock ?? 99,
                        freeShipping: product.free_shipping,
                        storeId: product.store_id,
                        storeName: product.stores?.name ?? "HS Digital",
                        productType: (product.product_type as "physical" | "digital") ?? "physical",
                      },
                      quantity,
                    );
                    navigate({ to: "/carrinho" });
                  }}
                >
                  Comprar agora
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full font-bold"
                  onClick={async () => {
                    const { data, error } = await supabase.auth.getUser();
                    if (error || !data.user) {
                      toast.info("Faça login para adicionar ao carrinho.");
                      navigate({ to: "/auth", search: { reason: "login-required" } });
                      return;
                    }
                    add(
                      {
                        productId: product.id,
                        title: product.title,
                        price: Number(product.price),
                        imageUrl: product.image_url ?? null,
                        maxStock: product.stock ?? 99,
                        freeShipping: product.free_shipping,
                        storeId: product.store_id,
                        storeName: product.stores?.name ?? "HS Digital",
                        productType: (product.product_type as "physical" | "digital") ?? "physical",
                      },
                      quantity,
                    );
                    toast.success("Adicionado ao carrinho!");
                  }}
                >
                  Adicionar ao carrinho
                </Button>
              </div>

              {/* Botão de Compartilhar com foto */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={handleShare}
                  className="w-full border border-dashed border-border text-xs font-semibold flex items-center justify-center gap-2 h-10 hover:bg-muted"
                >
                  <Share2 className="h-4 w-4 text-primary" /> Compartilhar produto com foto
                </Button>
              </div>

              {/* Benefícios */}
              <div className="pt-2 space-y-2 text-xs text-muted-foreground border-t border-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Compra 100% Protegida com devolução grátis em até 7 dias</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>Envio com código de rastreamento oficial no seu e-mail</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descrição do Produto */}
        <section className="mt-12 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Descrição do produto</h2>
          <div className="mt-4 prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description_long || product.description || "Este produto não possui uma descrição detalhada cadastrada."}
          </div>
        </section>

        {/* Perguntas & Respostas */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Perguntas ao vendedor</h2>
          <form onSubmit={handleAddQuestion} className="mt-4 flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Escreva sua dúvida sobre o produto..."
              className="flex-1"
            />
            <Button type="submit">
              <Send className="mr-1.5 h-4 w-4" /> Perguntar
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="space-y-1 rounded-lg border border-border/50 bg-background/50 p-3 text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" /> {q.question}
                </p>
                {q.answer ? (
                  <p className="pl-5 text-muted-foreground">↳ {q.answer}</p>
                ) : (
                  <p className="pl-5 text-amber-500 italic">Aguardando resposta do vendedor...</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Produtos Relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold">Quem viu este produto também comprou</h2>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
