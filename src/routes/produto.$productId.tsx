import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  CreditCard,
  Heart,
  HelpCircle,
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

// Tradução de termos comuns de fornecedores CJ para Português
const TRANSLATIONS: Record<string, string> = {
  "smart watch": "Smartwatch Relógio Inteligente",
  "smartwatch": "Smartwatch Inteligente",
  "wireless headphones": "Fone de Ouvido Bluetooth Sem Fio",
  "wireless earphones": "Fone de Ouvido Sem Fio",
  "earphones": "Fones de Ouvido",
  "bluetooth": "Bluetooth",
  "phone case": "Capa para Celular",
  "fast charging": "Carregamento Rápido",
  "charger": "Carregador",
  "cable": "Cabo",
  "led light": "Luminária de LED",
  "night light": "Luminária Noturna",
  "backpack": "Mochila Impermeável",
  "bag": "Bolsa",
  "wallet": "Carteira",
  "sunglasses": "Óculos de Sol",
  "water bottle": "Garrafa Térmica",
  "kitchen": "Cozinha",
  "tool": "Ferramenta",
  "cleaning": "Limpeza",
  "car": "Para Carro",
  "holder": "Suporte",
  "stand": "Suporte",
  "magnetic": "Magnético",
  "waterproof": "À Prova D'Água",
  "portable": "Portátil",
  "hot sale": "",
  "new arrival": "",
  "creative": "",
  "fashion": "",
};

function translateText(text?: string | null): string {
  if (!text) return "";
  let clean = text;
  for (const [en, pt] of Object.entries(TRANSLATIONS)) {
    const regex = new RegExp(`\\b${en}\\b`, "gi");
    clean = clean.replace(regex, pt);
  }
  clean = clean.replace(/\s+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export const Route = createFileRoute("/produto/$productId")({
  head: () => ({
    meta: [
      { title: "Produto · HS Digital Marketplace" },
      { name: "description", content: "Confira todos os detalhes deste produto na HS Digital." },
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

function ProductDetailPage() {
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
        question: "O produto vem com garantia?",
        answer: "Sim, todos os produtos possuem garantia de 30 dias contra defeitos de fabricação.",
        created_at: "há 2 dias",
      },
      {
        id: "q2",
        question: "Possui nota fiscal e código de rastreamento?",
        answer: "Sim! Enviamos o código de rastreio por e-mail e nos detalhes do pedido em até 24h.",
        created_at: "há 5 dias",
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

  const titlePt = translateText(product.title);
  const descriptionPt = translateText(product.description_long || product.description);

  const addProductToCart = () => {
    add(
      {
        productId: product.id,
        title: titlePt,
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

  // Produtos relacionados (mesma categoria)
  const relatedProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-2 sm:px-4 py-4">
        {/* Breadcrumb estilo Mercado Livre */}
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
          <Link to="/" className="text-[#3483fa] hover:underline">Voltar à lista</Link>
          <span>|</span>
          <span className="capitalize">{product.category ? translateText(product.category) : "Eletrônicos"}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate max-w-[200px] sm:max-w-md">{titlePt}</span>
        </nav>

        {/* CONTAINER PRINCIPAL DO PRODUTO (3 COLUNAS NO DESKTOP) */}
        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Lado Esquerdo + Centro (Fotos e Informações Principais) */}
            <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
              {/* Fotos: Miniaturas na vertical + Foto Principal */}
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {/* Miniaturas laterais */}
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

                {/* Imagem Principal com Fundo Branco */}
                <div className="flex-1 flex items-center justify-center min-h-[300px] sm:min-h-[440px] max-h-[500px] bg-white p-2">
                  <img
                    src={media[selectedImage]?.url ?? product.image_url ?? ""}
                    alt={titlePt}
                    className="max-h-[460px] max-w-full object-contain"
                  />
                </div>
              </div>

              {/* Informações Centrais do Produto */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Novo | +{compact(product.sold_count || 1000)} vendidos</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsFavorite(!isFavorite)} className="text-[#3483fa] hover:opacity-80">
                      <Heart className={`h-5 w-5 ${isFavorite ? "fill-[#3483fa]" : ""}`} />
                    </button>
                    <Share2 className="h-5 w-5 text-[#3483fa] cursor-pointer" />
                  </div>
                </div>

                {/* Badge Mais Vendido */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-[#ff7733] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                    MAIS VENDIDO
                  </span>
                  <span className="text-xs text-[#3483fa]">1º em {product.category ? translateText(product.category) : "Destaques"}</span>
                </div>

                {/* Título */}
                <h1 className="mt-2 text-xl sm:text-2xl font-semibold leading-snug text-gray-900">
                  {titlePt}
                </h1>

                {/* Avaliação */}
                <div className="mt-2 flex items-center gap-1.5 text-sm">
                  <span className="font-semibold text-gray-900">{Number(product.rating || 4.8).toFixed(1)}</span>
                  <div className="flex text-[#3483fa]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[#3483fa]" />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">({product.reviews_count || 128})</span>
                </div>

                {/* Preço estilo Mercado Livre */}
                <div className="mt-4">
                  {product.compare_at_price && (
                    <span className="text-xs text-gray-400 line-through">
                      {brl(Number(product.compare_at_price))}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-normal text-gray-900">
                      {brl(Number(product.price))}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#00a650] font-medium">em 12x no cartão de crédito</p>
                  <button className="mt-1 text-xs text-[#3483fa] hover:underline">Ver os meios de pagamento</button>
                </div>

                {/* O que você precisa saber sobre este produto */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    O que você precisa saber sobre este produto:
                  </h3>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
                    <li>Produto original com garantia do fabricante e envio imediato.</li>
                    <li>Compatível e testado com os mais rigorosos padrões de qualidade.</li>
                    <li>Acompanha embalagem lacrada e todos os acessórios originais.</li>
                    <li>Disponível para pronta entrega para todo o Brasil.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Coluna Direita (Buy Box Oficial estilo Mercado Livre) */}
            <div className="rounded-lg border border-gray-200 p-4 sm:p-5 flex flex-col justify-between bg-white shadow-xs">
              <div>
                {/* Tag Frete Grátis */}
                <div className="inline-flex items-center gap-1.5 rounded bg-[#00a650] px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wide">
                  FRETE GRÁTIS ACIMA DE R$ 19
                </div>

                {/* Prazo de entrega */}
                <div className="mt-3 text-xs leading-relaxed">
                  <p className="text-[#00a650] font-semibold text-sm">
                    Chegará grátis em poucos dias
                  </p>
                  <p className="text-gray-500 text-[11px]">Benefício exclusivo para a sua compra</p>
                </div>

                {/* Retirada */}
                <div className="mt-3 flex items-start gap-2 text-xs text-gray-600">
                  <MapPin className="h-4 w-4 text-[#00a650] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-900 font-medium">Envio rápido com rastreamento</span>
                    <p className="text-[11px] text-gray-500">Direto na sua residência</p>
                  </div>
                </div>

                {/* Estoque */}
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-900">Estoque disponível</p>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                    Armazenado e enviado por <span className="font-bold text-[#00a650] flex items-center"><Zap className="h-3 w-3 fill-[#00a650]" /> FULL</span>
                  </div>
                </div>

                {/* Quantidade */}
                <div className="mt-4 flex items-center justify-between rounded border p-2 text-xs">
                  <span className="text-gray-600">Quantidade:</span>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-bold">{quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setQuantity((q) => Math.min(product.stock || 50, q + 1))}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-[11px] text-gray-400">({product.stock || 50} disponíveis)</span>
                </div>

                {/* Botões de Compra do Mercado Livre */}
                <div className="mt-5 space-y-2">
                  <Button
                    onClick={() => {
                      addProductToCart();
                      navigate({ to: "/carrinho" });
                    }}
                    className="w-full bg-[#3483fa] hover:bg-[#2968c8] text-white font-semibold py-5 text-sm rounded-md"
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

                {/* Vendedor */}
                <div className="mt-5 border-t pt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-500">Loja oficial: <strong className="text-gray-900">{product.stores?.name ?? "HS Digital"}</strong></span>
                  </div>
                  <p className="text-[11px] text-[#00a650] font-medium mt-1">+10 mil vendas concretizadas</p>
                </div>

                {/* Garantias */}
                <div className="mt-4 space-y-2 text-[11px] text-gray-500 border-t pt-3">
                  <div className="flex items-start gap-1.5">
                    <RotateCcw className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <span><strong className="text-gray-700">Devolução grátis.</strong> Você tem 30 dias a partir da data de recebimento.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <span><strong className="text-gray-700">Compra Garantida.</strong> Receba o produto que está esperando ou devolvemos o dinheiro.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: CARACTERÍSTICAS DO PRODUTO (TABELAS CINZAS ESTILO MERCADO LIVRE DA FOTO 2) */}
          <section className="mt-12 border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Características do produto</h2>

            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              {/* Tabelas de características */}
              <div className="space-y-6">
                {/* Principais */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Características principais</h3>
                  <div className="rounded-lg border overflow-hidden text-xs">
                    <div className="grid grid-cols-2 bg-[#f5f5f5] p-3 font-medium">
                      <span className="text-gray-500">Marca</span>
                      <span className="text-gray-800 font-semibold">{product.stores?.name ?? "Importado Oficial"}</span>
                    </div>
                    <div className="grid grid-cols-2 bg-white p-3 border-t">
                      <span className="text-gray-500">Modelo</span>
                      <span className="text-gray-800">{product.category ? translateText(product.category) : "Edição Padrão"}</span>
                    </div>
                  </div>
                </div>

                {/* Dimensões e Outros */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Especificações Técnicas</h3>
                  <div className="rounded-lg border overflow-hidden text-xs divide-y">
                    <div className="grid grid-cols-2 bg-[#f5f5f5] p-3 font-medium">
                      <span className="text-gray-500">Condição do item</span>
                      <span className="text-gray-800">Novo e Lacrado</span>
                    </div>
                    <div className="grid grid-cols-2 bg-white p-3">
                      <span className="text-gray-500">Tipo de Envio</span>
                      <span className="text-gray-800">Rastreamento Oficial Correios/Transportadora</span>
                    </div>
                    <div className="grid grid-cols-2 bg-[#f5f5f5] p-3">
                      <span className="text-gray-500">Garantia</span>
                      <span className="text-gray-800">30 dias do vendedor</span>
                    </div>
                    {product.specifications &&
                      Object.entries(product.specifications).map(([key, val], idx) => (
                        <div key={key} className={`grid grid-cols-2 p-3 ${idx % 2 === 0 ? "bg-white" : "bg-[#f5f5f5]"}`}>
                          <span className="text-gray-500">{translateText(key)}</span>
                          <span className="text-gray-800">{translateText(String(val))}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Descrição Detalhada */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                    {descriptionPt || "Produto completo com alta durabilidade e pronta entrega. Todos os itens são inspecionados antes do despacho."}
                  </p>
                </div>
              </div>

              {/* Meios de Pagamento estilo Mercado Pago (Foto 2) */}
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-4 bg-white text-xs">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#3483fa]" /> Meios de pagamento
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-700">Cartões de crédito</p>
                      <p className="text-[10px] text-gray-500">Pague em até 12x!</p>
                      <div className="flex gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-blue-900">VISA</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-red-600">Mastercard</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-black">ELO</span>
                      </div>
                    </div>

                    <div className="border-t pt-2">
                      <p className="text-[11px] font-semibold text-[#00a650]">Pix</p>
                      <p className="text-[10px] text-gray-500">Aprovação imediata e envio mais rápido.</p>
                    </div>

                    <div className="border-t pt-2">
                      <p className="text-[11px] font-semibold text-gray-700">Boleto bancário</p>
                      <p className="text-[10px] text-gray-500">Disponível no fechamento do pedido.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: PERGUNTAS E RESPOSTAS */}
          <section className="mt-12 border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Perguntas e respostas</h2>

            <form onSubmit={handleAskQuestion} className="flex gap-2 max-w-2xl mb-6">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Escreva uma pergunta..."
                className="bg-white text-xs"
              />
              <Button type="submit" className="bg-[#3483fa] hover:bg-[#2968c8] text-white text-xs font-semibold px-6">
                <Send className="h-3.5 w-3.5 mr-1" /> Perguntar
              </Button>
            </form>

            <div className="space-y-3 max-w-2xl">
              <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Últimas perguntas feitas</h3>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Produtos relacionados</h2>
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
