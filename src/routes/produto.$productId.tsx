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
      { name: "description", content: "Confira todos os detalhes deste produto na HS Digital com envio rápido e compra protegida." },
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
        answer: "O envio é realizado em até 24h úteis após a confirmação. O código de rastreamento é enviado por e-mail.",
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
      localStorage.setItem(`questions_${productId}`, JSON.stringify(questions));
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

  // Título original mantido
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
          <Link to="/" className="text-[#3483fa] hover:underline">Voltar à lista</Link>
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
                <div className="text-xs text-gray-400">
                  Novo | +{compact(product.sold_count ?? 100)} vendidos
                </div>
                <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                  {originalTitle}
                </h1>

                {/* Avaliação e Vendas */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className="flex items-center text-[#3483fa]">
                    <Star className="h-4 w-4 fill-[#3483fa]" />
                  </div>
                  <span className="font-semibold text-gray-700">{product.rating ?? 4.9}</span>
                  <span className="text-gray-400">({compact(product.reviews_count ?? 328)} avaliações)</span>
                </div>

                {/* Preço */}
                <div className="mt-4 border-t pt-4">
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-sm text-gray-400 line-through">
                      {brl(product.compare_at_price)}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-light text-gray-900">{brl(product.price)}</span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-xs font-bold text-[#00a650]">
                        {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#00a650] font-medium">em 10x sem juros</p>
                </div>

                {/* Destaques Técnicos Rápidos */}
                <div className="mt-6 rounded-md bg-gray-50 p-3 text-xs text-gray-700 space-y-1.5 border border-gray-100">
                  <p className="font-bold text-gray-900">O que você precisa saber sobre este produto:</p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-600">
                    <li>Produto original com envio rápido e código de rastreio oficial.</li>
                    <li>Garantia incondicional de 30 dias com devolução grátis.</li>
                    <li>Compatível com padrões nacionais e suporte do vendedor.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: BUY BOX (MERCADO LIVRE STYLE) */}
            <div className="rounded-lg border border-gray-200 p-5 bg-white shadow-xs flex flex-col justify-between">
              <div>
                {/* Benefícios de Envio */}
                <div className="space-y-3 border-b pb-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Truck className="h-5 w-5 text-[#00a650] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#00a650]">Frete grátis na sua 1ª compra</p>
                      <p className="text-gray-500">Envio para todo o Brasil com código de rastreio</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <RotateCcw className="h-5 w-5 text-[#3483fa] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-800">Devolução grátis</p>
                      <p className="text-gray-500">Você tem 30 dias a partir da data de recebimento.</p>
                    </div>
                  </div>
                </div>

                {/* Quantidade */}
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">Quantidade:</span>
                  <div className="flex items-center gap-1.5 border rounded-md p-1">
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
                  <span className="text-[11px] text-gray-400">({product.stock || 50} em estoque)</span>
                </div>

                {/* Botões de Ação com aviso temporário */}
                <div className="mt-5 space-y-2">
                  <Button
                    onClick={() => {
                      addProductToCart();
                      navigate({ to: "/carrinho" });
                    }}
                    className="w-full bg-[#3483fa] hover:bg-[#2968c8] text-white font-semibold py-5 text-sm rounded-md shadow-sm"
                  >
                    Comprar agora
                  </Button>
                  <Button
                    onClick={() => {
                      addProductToCart();
                      toast.success("Produto adicionado ao carrinho!", {
                        duration: 2500,
                        icon: <Check className="h-4 w-4 text-[#00a650]" />,
                      });
                    }}
                    variant="outline"
                    className="w-full bg-[#e3edfb] hover:bg-[#d5e4f7] text-[#3483fa] border-transparent font-semibold py-5 text-sm rounded-md"
                  >
                    Adicionar ao carrinho
                  </Button>
                </div>

                {/* Loja e Garantias */}
                <div className="mt-6 space-y-2.5 text-xs text-gray-500 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-400" />
                    <span>Vendido por <strong className="text-gray-800">{product.stores?.name ?? "Loja Parceira HS"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#00a650]" />
                    <span><strong>Compra Garantida:</strong> receba o produto ou seu dinheiro de volta.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* DESCRIÇÃO COMPLETA */}
        <section className="mt-6 rounded-lg bg-white p-5 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Descrição Detalhada</h2>
          <div className="mt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line space-y-4">
            {rawDescription ? (
              rawDescription
            ) : (
              <p className="text-gray-500 italic">
                Este produto conta com qualidade assegurada, inspeção direta do fornecedor parceiro e suporte total pós-venda.
              </p>
            )}
          </div>
        </section>

        {/* PERGUNTAS E RESPOSTAS */}
        <section className="mt-6 rounded-lg bg-white p-5 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Perguntas e Respostas</h2>
          <p className="text-xs text-gray-500 mt-1">Tire suas dúvidas diretamente com o vendedor</p>

          <form onSubmit={handleAskQuestion} className="mt-4 flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Escreva sua pergunta para o vendedor..."
              className="text-sm"
            />
            <Button type="submit" className="bg-[#3483fa] hover:bg-[#2968c8] text-white">
              <Send className="h-4 w-4 mr-1.5" /> Perguntar
            </Button>
          </form>

          <div className="mt-6 space-y-4 divide-y">
            {questions.map((q) => (
              <div key={q.id} className="pt-4 first:pt-0">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                    {q.answer ? (
                      <p className="mt-1 text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100">
                        {q.answer}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-600 italic">Aguardando resposta do vendedor...</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PRODUTOS RELACIONADOS */}
        {relatedProducts.length > 0 && (
          <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quem comprou este produto também comprou</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
