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

export const Route = createFileRoute("/produto/$productId")({
  head: () => ({
    meta: [
      { title: "Produto · HS Digital Marketplace" },
      {
        name: "description",
        content: "Confira todos os detalhes deste produto na HS Digital com envio rápido e compra protegida.",
      },
    ],
  }),
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

  // Gesto de deslizar o dedo (Swipe) na imagem no celular
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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

  // Pré-carregamento suave da próxima foto para transição instantânea
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
    if (!touch) return;
    const touchEndX = touch.clientX;
    const diff = touchStartX - touchEndX;

    // Deslizou para a esquerda -> próxima foto
    if (diff > 45 && selectedImage < media.length - 1) {
      setImageLoaded(false);
      setSelectedImage((prev) => prev + 1);
    }
    // Deslizou para a direita -> foto anterior
    if (diff < -45 && selectedImage > 0) {
      setImageLoaded(false);
      setSelectedImage((prev) => prev - 1);
    }
    setTouchStartX(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#ebebeb]">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-[600px] rounded-lg bg-white animate-pulse" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#ebebeb]">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="rounded-lg bg-white p-12 shadow-sm">
            <h1 className="text-xl font-bold">Produto não encontrado</h1>
            <Button asChild className="mt-4 bg-[#3483fa]">
              <Link to="/">Voltar para a página inicial</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const originalTitle = product.title;
  const rawDescription = product.description_long || product.description || "";

  // Identificação da categoria para navegação estilo Mercado Livre
  const categoryConfig = CATEGORIES.find(
    (c) => c.slug === product.category || c.label.toLowerCase() === (product.category ?? "").toLowerCase(),
  );
  const categorySlug = categoryConfig?.slug ?? product.category ?? "geral";
  const categoryLabel = categoryConfig?.label ?? product.category ?? "Variedades";

  // Produtos relacionados estritamente da mesma categoria estilo Mercado Livre
  const categoryProducts = allProducts
    .filter((p) => p.id !== product.id && (p.category === product.category || p.category === categorySlug))
    .slice(0, 6);

  const fallbackRelatedProducts =
    categoryProducts.length > 0 ? categoryProducts : allProducts.filter((p) => p.id !== product.id).slice(0, 6);

  const addProductToCart = () => {
    add(
      {
        productId: product.id,
        title: originalTitle,
        price: Number(product.price),
        imageUrl: product.image_url,
        storeId: product.store_id,
        storeName: product.stores?.name ?? "Loja parceira",
        freeShipping: product.free_shipping,
        productType: product.product_type,
        stock: product.stock,
      },
      quantity,
    );
    void trackAbandonedCart(product.id, quantity);
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setQuestions([
      {
        id: String(Date.now()),
        question: newQuestion.trim(),
        created_at: "agora",
      },
      ...questions,
    ]);
    setNewQuestion("");
    toast.success("Pergunta enviada com sucesso!");
  };

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900 overflow-x-hidden">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-3 sm:py-6">
        {/* BREADCRUMB ESTILO MERCADO LIVRE (CATEGORIA É CLICÁVEL) */}
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
          <Link to="/" className="text-[#3483fa] hover:underline shrink-0">
            Início
          </Link>
          <span>/</span>
          <Link
            to="/"
            search={{ category: categorySlug }}
            className="text-[#3483fa] font-medium hover:underline shrink-0 capitalize"
            title={`Ver todos os produtos de ${categoryLabel}`}
          >
            {categoryLabel}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
          <span className="truncate font-normal text-gray-600">{originalTitle}</span>
        </nav>

        {/* CONTAINER PRINCIPAL DO PRODUTO */}
        <div className="rounded-xl bg-white p-3 sm:p-6 shadow-sm border border-gray-100">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* LADO ESQUERDO: FOTOS + DETALHES CENTRAIS */}
            <div className="grid gap-6 md:grid-cols-[1fr_1.1fr] min-w-0">
              {/* Fotos */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 min-w-0">
                {/* Miniaturas com carregamento leve (lazy) */}
                <div className="flex sm:flex-col gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {media.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setImageLoaded(false);
                        setSelectedImage(index);
                      }}
                      className={`relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg border p-1 bg-gray-50 transition-all ${
                        selectedImage === index
                          ? "border-2 border-[#3483fa] ring-1 ring-blue-400 shadow-sm"
                          : "border-gray-200 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={item.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
                </div>

                {/* Foto Principal com Gesto Touch (Swipe) e Prioridade de Rede */}
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="relative aspect-square w-full max-w-[420px] mx-auto rounded-xl border border-gray-100 bg-white p-3 flex items-center justify-center select-none touch-pan-y overflow-hidden"
                >
                  {/* Efeito esqueleto enquanto a imagem externa carrega */}
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center text-xs text-gray-400 font-medium">
                      Carregando foto...
                    </div>
                  )}

                  <img
                    key={media[selectedImage]?.url || product.image_url || "main"}
                    src={media[selectedImage]?.url || product.image_url || undefined}
                    alt={originalTitle}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    onLoad={() => setImageLoaded(true)}
                    className={`max-h-[320px] sm:max-h-[380px] w-full object-contain transition-opacity duration-200 ${
                      imageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  {/* Contador de fotos no mobile */}
                  {media.length > 1 && (
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                      {selectedImage + 1} / {media.length}
                    </div>
                  )}

                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-gray-500 hover:text-red-500 shadow-sm"
                    aria-label="Favoritar"
                  >
                    <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Informações Principais do Produto */}
              <div className="flex flex-col min-w-0">
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                  <span>Novo</span>
                  <span>•</span>
                  <span>+{compact(product.sold_count ?? 150)} vendidos</span>
                </div>

                {/* Título Oficial */}
                <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-snug break-words">
                  {originalTitle}
                </h1>

                {/* Avaliações */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className="flex text-[#3483fa]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[#3483fa]" />
                    ))}
                  </div>
                  <span className="font-semibold text-gray-700">{product.rating ?? 4.9}</span>
                  <span className="text-gray-400">({compact(product.reviews_count ?? 328)})</span>
                </div>

                {/* Preço e Parcelamento */}
                <div className="mt-3 border-t pt-3">
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-xs text-gray-400 line-through">{brl(product.compare_at_price)}</span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-light text-gray-900">{brl(product.price)}</span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-xs font-bold text-[#00a650]">
                        {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-600">
                    em <span className="font-semibold text-[#00a650]">10x de {brl(Number(product.price) / 10)}</span>{" "}
                    sem juros
                  </p>
                </div>

                {/* Destaque de Envio e Frete */}
                <div className="mt-3 space-y-1 rounded-lg bg-[#f5f9ff] p-3 text-xs text-gray-700 border border-blue-100">
                  <div className="flex items-center gap-2 font-semibold text-[#00a650]">
                    <Truck className="h-4 w-4 shrink-0" />
                    <span>
                      {product.free_shipping || Number(product.price) >= 79
                        ? "Frete grátis para todo o Brasil"
                        : "Envio rápido com rastreamento"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Chegará rapidamente no seu endereço com código de rastreio oficial.
                  </p>
                </div>

                {/* O que você precisa saber sobre este produto */}
                <div className="mt-4 border-t pt-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    O que você precisa saber sobre este produto:
                  </h3>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
                    <li>Produto 100% original, novo e testado antes do despacho.</li>
                    <li>Compatível com as principais especificações e voltagens descritas.</li>
                    <li>Garantia total de 30 dias contra qualquer defeito de fabricação.</li>
                    <li>Acompanha suporte pós-venda direto com o vendedor.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: CAIXA DE COMPRA */}
            <div className="h-fit rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs bg-gray-50/50">
              <div className="text-xs text-[#00a650] font-semibold flex items-center gap-1.5">
                <Truck className="h-4 w-4 shrink-0" /> Envio rápido garantido
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Compre com tranquilidade: Compra Protegida pela HS Digital.
              </p>

              {/* Quantidade */}
              <div className="mt-4 flex items-center justify-between border-y py-3 text-xs">
                <span className="font-medium text-gray-700">Quantidade:</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-bold text-gray-900">{quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={quantity >= (product.stock || 50)}
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-[11px] text-gray-400">({product.stock || 50} disp.)</span>
              </div>

              {/* Botões de Ação */}
              <div className="mt-4 space-y-2">
                <Button
                  onClick={() => {
                    addProductToCart();
                    navigate({ to: "/carrinho" });
                  }}
                  className="w-full bg-[#3483fa] hover:bg-[#2968c8] text-white font-semibold py-5 text-sm rounded-lg shadow-sm"
                >
                  Comprar agora
                </Button>
                <Button
                  onClick={() => {
                    addProductToCart();
                  }}
                  variant="outline"
                  className="w-full bg-white hover:bg-gray-50 text-[#3483fa] border-blue-200 font-semibold py-5 text-sm rounded-lg"
                >
                  Adicionar ao carrinho
                </Button>
              </div>

              {/* Loja e Garantias */}
              <div className="mt-4 border-t pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-gray-500 shrink-0" />
                  <span className="text-gray-500 truncate">
                    Loja oficial: <strong className="text-gray-900">{product.stores?.name ?? "HS Digital"}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-[#00a650] font-medium mt-1">+10 mil vendas concretizadas</p>
              </div>

              <div className="mt-3 space-y-2 text-[11px] text-gray-500 border-t pt-3">
                <div className="flex items-start gap-1.5">
                  <RotateCcw className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-700">Devolução grátis.</strong> Você tem 30 dias a partir da data de
                    recebimento.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-700">Compra Garantida.</strong> Receba o produto ou seu dinheiro de
                    volta.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DESCRIÇÃO COMPLETA */}
          <section className="mt-10 border-t pt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Descrição do produto</h2>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-sm mb-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />O que devo prestar atenção antes de comprar?
                  </div>
                  <ul className="space-y-1 list-disc pl-5 leading-relaxed">
                    <li>Verifique as especificações do item antes de finalizar o pedido.</li>
                    <li>Produto inspecionado e embalado no padrão original de fábrica.</li>
                    <li>Garantia e suporte direto com a nossa equipe no pós-venda.</li>
                  </ul>
                </div>

                <div className="rounded-xl border bg-white p-4 sm:p-5 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                  <h3 className="text-base font-bold text-gray-900 mb-3 border-b pb-2">
                    Apresentação e Recursos do Produto
                  </h3>
                  {rawDescription ? (
                    rawDescription
                  ) : (
                    <div>
                      <p>Produto de alta qualidade e excelente custo-benefício, testado e aprovado.</p>
                      <h4 className="font-bold text-gray-800 mt-4 mb-2">Principais Características:</h4>
                      <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-600">
                        <li>Alta durabilidade com acabamento premium e materiais de primeira linha.</li>
                        <li>Fácil de usar e pronto para o dia a dia.</li>
                        <li>Garantia total contra qualquer defeito de fabricação.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* PERGUNTAS E RESPOSTAS */}
          <section className="mt-10 border-t pt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Perguntas e respostas</h2>

            <form onSubmit={handleAskQuestion} className="flex gap-2 max-w-2xl mb-6">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Escreva sua pergunta para o vendedor..."
                className="text-sm"
              />
              <Button type="submit" className="bg-[#3483fa] hover:bg-[#2968c8] text-white shrink-0">
                <Send className="h-4 w-4 mr-1.5" /> Perguntar
              </Button>
            </form>

            <div className="space-y-3 max-w-3xl">
              {questions.map((q) => (
                <div key={q.id} className="rounded-lg bg-gray-50 p-3 text-xs border border-gray-100">
                  <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span>{q.question}</span>
                  </div>
                  {q.answer && (
                    <div className="mt-1 pl-5 text-gray-600 border-l-2 border-blue-400 ml-1">{q.answer}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* SEÇÃO ESTILO MERCADO LIVRE: PRODUTOS DA MESMA CATEGORIA */}
          <section className="mt-12 border-t pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mais produtos em {categoryLabel}</h2>
                <p className="text-xs text-gray-500">Produtos similares disponíveis com entrega rápida</p>
              </div>

              {/* Botão estilo Mercado Livre para carregar a vitrine inteira da categoria */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs text-[#3483fa] border-blue-200 hover:bg-blue-50 self-start sm:self-auto"
              >
                <Link to="/" search={{ category: categorySlug }}>
                  Ver todos os produtos desta categoria
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-4">
              {fallbackRelatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
