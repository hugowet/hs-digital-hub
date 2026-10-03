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

  // Mantemos o título original intacto
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
    toast.success("Pergunta enviada com sucesso!");
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
                    src={media[selectedImage]?.url || product.image_url}
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

              {/* Informações Principais do Produto */}
              <div className="flex flex-col">
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                  <span>Novo</span>
                  <span>|</span>
                  <span>+{compact(product.sold_count ?? 150)} vendidos</span>
                </div>

                {/* Título Oficial */}
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                  {originalTitle}
                </h1>

                {/* Avaliações */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className="flex text-[#3483fa]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-[#3483fa]" />
                    ))}
                  </div>
                  <span className="font-semibold text-gray-700">{product.rating_average ?? 4.9}</span>
                  <span className="text-gray-400">({compact(product.rating_count ?? 328)} avaliações)</span>
                </div>

                {/* Preço e Parcelamento */}
                <div className="mt-4 border-t pt-4">
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-xs text-gray-400 line-through">
                      {brl(product.compare_at_price)}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-light text-gray-900">
                      {brl(product.price)}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-sm font-bold text-[#00a650]">
                        {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    em <span className="font-semibold text-[#00a650]">10x de {brl(Number(product.price) / 10)}</span> sem juros
                  </p>
                </div>

                {/* Destaque de Envio e Frete */}
                <div className="mt-4 space-y-2 rounded-lg bg-[#f5f9ff] p-3 text-xs text-gray-700 border border-blue-100">
                  <div className="flex items-center gap-2 font-semibold text-[#00a650]">
                    <Truck className="h-4 w-4" />
                    <span>{product.free_shipping || Number(product.price) >= 79 ? "Frete grátis para todo o Brasil" : "Envio rápido com rastreamento"}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Chegará rapidamente no seu endereço com código de rastreio oficial.
                  </p>
                </div>

                {/* O que você precisa saber sobre este produto */}
                <div className="mt-5 border-t pt-4">
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

            {/* LADO DIREITO: BUY BOX (CAIXA DE COMPRA MERCADO LIVRE) */}
            <div className="h-fit rounded-lg border border-gray-200 p-4 sm:p-5 shadow-sm">
              <div className="text-xs text-[#00a650] font-semibold flex items-center gap-1.5">
                <Truck className="h-4 w-4" /> Envio rápido garantido
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Compre com tranquilidade: Compra Protegida pela HS Digital.
              </p>

              {/* Quantidade */}
              <div className="mt-5 flex items-center justify-between border-y py-3 text-xs">
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
                <span className="text-[11px] text-gray-400">({product.stock || 50} em estoque)</span>
              </div>

              {/* Botões de Ação */}
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
                    toast.success("Produto adicionado ao carrinho!");
                  }}
                  variant="outline"
                  className="w-full bg-[#e3edfb] hover:bg-[#d5e4f7] text-[#3483fa] border-transparent font-semibold py-5 text-sm rounded-md"
                >
                  Adicionar ao carrinho
                </Button>
              </div>

              {/* Loja e Garantias */}
              <div className="mt-5 border-t pt-4 text-xs">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">Loja oficial: <strong className="text-gray-900">{product.stores?.name ?? "HS Digital"}</strong></span>
                </div>
                <p className="text-[11px] text-[#00a650] font-medium mt-1">+10 mil vendas concretizadas</p>
              </div>

              <div className="mt-4 space-y-2 text-[11px] text-gray-500 border-t pt-3">
                <div className="flex items-start gap-1.5">
                  <RotateCcw className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span><strong className="text-gray-700">Devolução grátis.</strong> Você tem 30 dias a partir da data de recebimento.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span><strong className="text-gray-700">Compra Garantida.</strong> Receba o produto que está esperando ou devolvemos seu dinheiro.</span>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: DESCRIÇÃO COMPLETA ESTILO MERCADO LIVRE */}
          <section className="mt-12 border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Descrição do produto</h2>

            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              
              {/* CORPO DA DESCRIÇÃO ESTRUTURADA */}
              <div className="space-y-6">
                
                {/* 1. Caixa de Avisos Importantes */}
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-sm mb-2">
                    <AlertCircle className="h-4 w-4" />
                    O que devo prestar atenção antes de comprar?
                  </div>
                  <ul className="space-y-1 list-disc pl-5 leading-relaxed">
                    <li>Verifique a compatibilidade do modelo com seu uso pretendido antes de finalizar o pedido.</li>
                    <li>Produto inspecionado, testado e embalado em conformidade com o padrão original de fábrica.</li>
                    <li>Acompanha todos os acessórios e manuais oficiais descritos no anúncio.</li>
                    <li>Suporte e atendimento ao cliente à disposição no chat e nas perguntas.</li>
                  </ul>
                </div>

                {/* 2. Conteúdo da Descrição */}
                <div className="rounded-lg border bg-white p-5 text-sm leading-relaxed text-gray-700 whitespace-pre-line shadow-xs">
                  <h3 className="text-base font-bold text-gray-900 mb-3 border-b pb-2">
                    Apresentação e Recursos do Produto
                  </h3>
                  {rawDescription ? (
                    rawDescription
                  ) : (
                    <div>
                      <p>
                        Se você está procurando um produto de alta qualidade, confiabilidade e excelente custo-benefício, este item é a escolha ideal.
                      </p>
                      <h4 className="font-bold text-gray-800 mt-4 mb-2">Principais Funções & Vantagens:</h4>
                      <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-600">
                        <li>Alta durabilidade com acabamento premium e materiais de primeira linha.</li>
                        <li>Fácil de instalar e usar: tecnologia plug and play intuitiva.</li>
                        <li>Excelente desempenho com eficiência energética e testes rigorosos de qualidade.</li>
                        <li>Ideal tanto para uso pessoal quanto para profissionais que buscam praticidade.</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* 3. Tabela de Especificações Técnicas */}
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">Especificações Técnicas</h3>
                  <div className="rounded-lg border overflow-hidden text-xs divide-y">
                    <div className="grid grid-cols-2 bg-[#f5f5f5] p-3 font-medium">
                      <span className="text-gray-500">Marca / Fornecedor</span>
                      <span className="text-gray-800 font-semibold">{product.stores?.name ?? "Importado Oficial"}</span>
                    </div>
                    <div className="grid grid-cols-2 bg-white p-3">
                      <span className="text-gray-500">Condição do item</span>
                      <span className="text-gray-800">Novo e Lacrado</span>
                    </div>
                    <div className="grid grid-cols-2 bg-[#f5f5f5] p-3">
                      <span className="text-gray-500">Tipo de envio</span>
                      <span className="text-gray-800">Rastreamento oficial Correios / Transportadora</span>
                    </div>
                    <div className="grid grid-cols-2 bg-white p-3">
                      <span className="text-gray-500">Garantia do vendedor</span>
                      <span className="text-gray-800 font-bold text-[#00a650]">30 dias corridos</span>
                    </div>

                    {product.specifications &&
                      Object.entries(product.specifications).map(([key, val], idx) => (
                        <div key={key} className={`grid grid-cols-2 p-3 ${idx % 2 === 0 ? "bg-white" : "bg-[#f5f5f5]"}`}>
                          <span className="text-gray-500 capitalize">{key}</span>
                          <span className="text-gray-800">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 4. Garantia do Vendedor */}
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-xs text-green-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-6 w-6 text-[#00a650] shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-green-900">Garantia do vendedor: 30 dias</h4>
                      <p className="text-green-700">Se o produto apresentar qualquer inconformidade, você recebe outro ou o reembolso total.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* LADO DIREITO: MEIOS DE PAGAMENTO */}
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-4 bg-white text-xs shadow-xs">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#3483fa]" /> Meios de pagamento aceitos
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-700">Cartões de crédito</p>
                      <p className="text-[10px] text-gray-500">Pague em até 10x ou 12x</p>
                      <div className="flex gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-blue-900">VISA</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-red-600">Mastercard</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-black">ELO</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-orange-600">Hiper</span>
                      </div>
                    </div>

                    <div className="border-t pt-2">
                      <p className="text-[11px] font-semibold text-[#00a650]">Pix com aprovação imediata</p>
                      <p className="text-[10px] text-gray-500">Seu pedido entra em separação na mesma hora.</p>
                    </div>

                    <div className="border-t pt-2">
                      <p className="text-[11px] font-semibold text-gray-700">Boleto bancário</p>
                      <p className="text-[10px] text-gray-500">Compensação em 1 a 2 dias úteis.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* SEÇÃO 3: PERGUNTAS E RESPOSTAS */}
          <section className="mt-12 border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Perguntas e respostas</h2>

            <form onSubmit={handleAskQuestion} className="flex gap-2 max-w-2xl mb-6">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Escreva uma pergunta ao vendedor..."
                className="bg-white text-xs"
              />
              <Button type="submit" className="bg-[#3483fa] hover:bg-[#2968c8] text-white text-xs font-semibold px-6">
                <Send className="h-3.5 w-3.5 mr-1" /> Perguntar
              </Button>
            </form>

            <div className="space-y-3 max-w-2xl">
              <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Últimas perguntas respondidas</h3>
              {questions.map((q) => (
                <div key={q.id} className="text-xs border-b pb-3">
                  <p className="font-medium text-gray-900 flex items-start gap-1.5">
                    <span className="text-gray-400">P:</span> {q.question}
                  </p>
                  {q.answer && (
                    <p className="mt-1 text-gray-600 pl-4 border-l-2 border-gray-200">
                      <span className="text-gray-400 font-semibold">R:</span> {q.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* SEÇÃO 4: PRODUTOS RELACIONADOS */}
          {relatedProducts.length > 0 && (
            <section className="mt-12 border-t pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quem comprou este produto também viu</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
