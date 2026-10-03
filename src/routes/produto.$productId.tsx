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

  // Perguntas e Respostas com proteção de SSR para evitar erro no build
  const [newQuestion, setNewQuestion] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`questions_${productId}`);
        if (saved) return JSON.parse(saved);
      }
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
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`questions_${productId}`, JSON.stringify(questions));
      }
    } catch {}
  }, [questions, productId]);

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
    toast.success("Produto adicionado ao carrinho!", {
      duration: 2500,
      icon: <Check className="h-4 w-4 text-[#00a650]" />,
    });
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
    toast.success("Pergunta enviada com sucesso!", { duration: 2500 });
  };

  const relatedProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-2 sm:px-4 py-4">
        {/* BREADCRUMB */}
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
          <Link to="/" className="text-[#3483fa] hover:underline">
            Voltar à lista
          </Link>
          <span>|</span>
          <span className="capitalize">{product.category || "Variedades"}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate max-w-[200px] sm:max-w-md font-medium text-gray-700">{originalTitle}</span>
        </nav>

        {/* CONTAINER PRINCIPAL DO PRODUTO */}
        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* LADO ESQUERDO: FOTOS + INFORMAÇÕES CENTRAIS */}
            <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
              {/* Fotos */}
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible">
                  {media.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedImage(index)}
                      className={`h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded border p-1 transition-all ${
                        selectedImage === index ? "border-2 border-[#3483fa]" : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <img src={item.url} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>

                <div className="relative aspect-square w-full max-w-[420px] rounded-lg border border-gray-100 bg-white p-4 flex items-center justify-center">
                  <img
                    src={media[selectedImage]?.url || product.image_url || ""}
                    alt={originalTitle}
                    className="max-h-[380px] w-full object-contain"
                  />
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="absolute right-3 top-3 rounded-full bg-white/80 p-2 text-gray-500 hover:text-red-500 shadow-sm"
                  >
                    <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Informações Centrais */}
              <div className="flex flex-col">
                <div className="text-xs text-gray-400">Novo | +{compact(product.sold_count ?? 100)} vendidos</div>
                <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 leading-snug">{originalTitle}</h1>

                {/* Avaliação e Vendas */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className="flex items-center text-[#3483fa]">
                    <Star className="h-4 w-4 fill-[#3483fa]" />
                  </div>
                  <span className="font-semibold text-gray-700">{product.rating ?? 4.9}</span>
                  <span className="text-gray-400">({compact(product.reviews_count ?? 328)} avaliações)</span>
                </div>

                {/* Preço e Parcelamento */}
                <div className="mt-4">
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-sm text-gray-400 line-through">{brl(product.compare_at_price)}</span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-light text-gray-900">{brl(product.price)}</span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-sm font-semibold text-[#00a650]">
                        {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#00a650]">
                    em <strong>10x {brl(product.price / 10)}</strong> sem juros no cartão
                  </p>
                </div>

                {/* Vantagens Mercado Livre Style */}
                <div className="mt-6 space-y-3 border-t pt-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Truck className="h-4 w-4 text-[#00a650] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#00a650]">
                        {product.free_shipping || Number(product.price) >= 79
                          ? "Frete grátis nacional"
                          : "Envio rápido para todo o Brasil"}
                      </p>
                      <p className="text-gray-500">Saiba os prazos de entrega calculando no checkout</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <RotateCcw className="h-4 w-4 text-[#00a650] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#00a650]">Devolução grátis</p>
                      <p className="text-gray-500">Você tem 30 dias a partir da data de recebimento.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#00a650] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#00a650]">Compra Garantida HS Digital</p>
                      <p className="text-gray-500">Receba o produto que está esperando ou devolvemos seu dinheiro.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: BUY BOX (CAIXA DE COMPRA) */}
            <div className="rounded-lg border border-gray-200 p-4 shadow-xs h-fit space-y-4">
              <div className="text-xs text-[#00a650] font-bold">
                {product.free_shipping || Number(product.price) >= 79
                  ? "Chegará grátis com envio prioritário"
                  : "Envio para todo o Brasil"}
              </div>

              <div>
                <p className="text-xs text-gray-500">Estoque disponível</p>
                <p className="text-xs font-semibold text-gray-800">
                  {product.stock > 0 ? `Quantidade: ${product.stock} disponíveis` : "Sob encomenda com fornecedor"}
                </p>
              </div>

              {/* Seletor de Quantidade */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Quantidade:</span>
                <div className="flex items-center rounded border border-gray-300">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="p-1 hover:bg-gray-100">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold">{quantity}</span>
                  <button onClick={() => setQuantity((q) => q + 1)} className="p-1 hover:bg-gray-100">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => {
                    addProductToCart();
                    navigate({ to: "/carrinho" });
                  }}
                  className="w-full bg-[#3483fa] hover:bg-[#2968c8] text-white font-bold text-xs h-11"
                >
                  Comprar agora
                </Button>
                <Button
                  variant="outline"
                  onClick={addProductToCart}
                  className="w-full border-[#3483fa] text-[#3483fa] hover:bg-blue-50 font-semibold text-xs h-11"
                >
                  Adicionar ao carrinho
                </Button>
              </div>

              {/* Loja e Garantia */}
              <div className="border-t pt-3 text-[11px] text-gray-500 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-gray-400" />
                  <span>
                    Vendido e entregue por <strong>{product.stores?.name ?? "Loja Parceira Oficial"}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                  <span>Garantia do vendedor: 30 dias</span>
                </div>
              </div>
            </div>
          </div>

          {/* DESCRIÇÃO COMPLETA */}
          <div className="mt-10 border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Descrição do produto</h2>
            <div className="whitespace-pre-line text-sm text-gray-700 leading-relaxed font-sans max-w-4xl bg-gray-50/60 p-5 rounded-lg border border-gray-100">
              {rawDescription || "Nenhuma descrição adicional informada pelo fornecedor para este modelo."}
            </div>
          </div>

          {/* ESPECIFICAÇÕES TÉCNICAS */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Características técnicas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-3xl text-xs">
                {Object.entries(product.specifications).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b py-2 px-1 bg-gray-50/50">
                    <span className="font-semibold text-gray-600">{key}</span>
                    <span className="text-gray-800">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PERGUNTAS E RESPOSTAS */}
          <div className="mt-10 border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Perguntas e respostas</h2>
            <p className="text-xs text-gray-500 mb-4">
              Tire suas dúvidas diretamente com o vendedor ou confira as perguntas frequentes.
            </p>

            <form onSubmit={handleAskQuestion} className="flex gap-2 max-w-2xl mb-6">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Escreva sua pergunta sobre o produto..."
                className="text-xs h-10"
              />
              <Button type="submit" className="bg-[#3483fa] hover:bg-[#2968c8] text-white text-xs gap-1 h-10 px-5">
                <Send className="h-3.5 w-3.5" /> Perguntar
              </Button>
            </form>

            <div className="space-y-4 max-w-3xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Últimas perguntas feitas</h3>
              {questions.map((q) => (
                <div key={q.id} className="text-xs space-y-1 border-b pb-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-800 font-medium">{q.question}</span>
                  </div>
                  {q.answer && (
                    <div className="ml-5 flex items-start gap-1.5 text-gray-600 bg-gray-50 p-2 rounded">
                      <span className="text-gray-400">↳</span>
                      <span>{q.answer}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PRODUTOS RELACIONADOS */}
          {relatedProducts.length > 0 && (
            <div className="mt-12 border-t pt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quem comprou este produto também viu</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
