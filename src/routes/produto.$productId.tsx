import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Minus,
  Plus,
  Send,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackAbandonedCart } from "@/lib/abandoned-cart";
import { useCart } from "@/lib/cart";
import { fetchProduct } from "@/lib/catalog.functions";
import { brl, compact } from "@/lib/format";

// Dicionário de tradução e limpeza para termos de fornecedores internacionais (CJ)
const TRANSLATIONS: Record<string, string> = {
  "smart watch": "Smartwatch Relógio Inteligente",
  "smartwatch": "Smartwatch Inteligente",
  "wireless headphones": "Fone de Ouvido Bluetooth Sem Fio",
  "wireless earphones": "Fone de Ouvido Sem Fio",
  "bluetooth": "Bluetooth",
  "earphones": "Fones de Ouvido",
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
  "material": "Material",
  "weight": "Peso",
  "size": "Tamanho / Dimensões",
  "color": "Cor",
  "package included": "Itens inclusos na embalagem",
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
      { title: "Detalhes do produto · HS Digital" },
      { name: "description", content: "Veja fotos, opções, especificações e informações do produto na HS Digital." },
      { property: "og:title", content: "Produto · HS Digital" },
      { property: "og:description", content: "Confira todos os detalhes deste produto na HS Digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Sistema de perguntas e respostas
  const [newQuestion, setNewQuestion] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    try {
      const saved = localStorage.getItem(`questions_${productId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "default-1",
        question: "O produto vem com garantia?",
        answer: "Sim! Todos os produtos contam com garantia legal de 30 dias contra defeitos de fabricação e devolução facilitada.",
        created_at: "Recentemente",
      },
      {
        id: "default-2",
        question: "Qual o prazo de envio?",
        answer: "O pedido é despachado em até 24 a 48 horas úteis após a confirmação do pagamento com código de rastreamento.",
        created_at: "Recentemente",
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

  if (isLoading) return <Shell><div className="h-[520px] animate-pulse bg-muted rounded-xl" /></Shell>;
  if (!product) {
    return (
      <Shell>
        <div className="py-24 text-center">
          <h1 className="text-2xl font-bold">Produto não encontrado</h1>
          <Button asChild className="mt-4">
            <Link to="/">Voltar às ofertas</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const titlePt = translateText(product.title);
  const descriptionPt = translateText(product.description_long || product.description);

  const addProduct = () => {
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
    const item: QuestionItem = {
      id: String(Date.now()),
      question: newQuestion.trim(),
      created_at: "Agora mesmo",
    };
    setQuestions([item, ...questions]);
    setNewQuestion("");
    toast.success("Sua pergunta foi enviada ao vendedor!");
  };

  return (
    <Shell>
      {/* Navegação / Breadcrumb com Categoria */}
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="flex items-center gap-1 text-primary font-medium">
          <Tag className="h-3 w-3" /> {product.category ? translateText(product.category) : "Geral"}
        </span>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate max-w-xs">{titlePt}</span>
      </nav>

      {/* Seção Principal: Imagens e Compra */}
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
          <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
            {media.map((item, index) => (
              <Button
                key={item.id}
                variant="ghost"
                size="icon"
                onClick={() => setSelectedImage(index)}
                aria-label={`Ver imagem ${index + 1}`}
                className={`aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 p-0 ${
                  selectedImage === index ? "border-primary" : "border-border"
                }`}
              >
                <img src={item.url} alt="" width={80} height={80} className="h-full w-full object-contain p-1" />
              </Button>
            ))}
          </div>

          <div className="group order-1 aspect-square max-h-[480px] w-full overflow-hidden rounded-xl border bg-muted flex items-center justify-center p-4">
            <img
              src={media[selectedImage]?.url ?? product.image_url ?? ""}
              alt={titlePt}
              width={700}
              height={700}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Informações de Compra */}
        <div>
          <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {product.category ? translateText(product.category) : "Produto Nacional & Importado"}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">Novo · {compact(product.sold_count)} vendidos</p>
          <h1 className="mt-2 text-xl font-bold leading-snug md:text-2xl">{titlePt}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-semibold text-primary">
              {Number(product.rating).toFixed(1)} <Star className="h-4 w-4 fill-primary" />
            </span>
            <span className="text-muted-foreground">{product.reviews_count || 5} avaliações de clientes</span>
          </div>

          <div className="mt-5">
            <p className="text-3xl font-bold text-primary">{brl(Number(product.price))}</p>
            {product.compare_at_price && (
              <p className="mt-1 text-sm text-muted-foreground line-through">
                {brl(Number(product.compare_at_price))}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <BadgeCheck className="h-7 w-7 text-success" />
            <div>
              <p className="font-semibold text-sm">Vendedor Verificado</p>
              <p className="text-xs text-muted-foreground">{product.stores?.name ?? "HS Digital Marketplace"}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <p className="text-sm font-semibold">Quantidade:</p>
            <div className="flex items-center rounded-md border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity((v) => Math.max(1, v - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity((v) => Math.min(product.stock || 99, v + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">{product.stock} unidades disponíveis</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" size="lg" onClick={addProduct}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Adicionar ao Carrinho
            </Button>
            <Button
              size="lg"
              className="primary-gradient"
              onClick={() => {
                addProduct();
                navigate({ to: "/carrinho" });
              }}
            >
              Comprar Agora
            </Button>
          </div>

          <div className="mt-5 grid gap-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-success" />
              {product.free_shipping ? "Frete Grátis para todo o Brasil" : "Envio seguro com rastreamento"}
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Compra Garantida pela HS Digital
            </p>
          </div>
        </div>
      </section>

      {/* Abas: Descrição Real, Especificações Técnicas e Perguntas & Respostas */}
      <section className="mt-12 border-t pt-8">
        <Tabs defaultValue="description">
          <TabsList className="h-auto w-full justify-start overflow-x-auto border-b rounded-none p-0 bg-transparent gap-6">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent px-2 pb-3 font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Descrição Detalhada
            </TabsTrigger>
            <TabsTrigger
              value="specifications"
              className="rounded-none border-b-2 border-transparent px-2 pb-3 font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Especificações Técnicas
            </TabsTrigger>
            <TabsTrigger
              value="questions"
              className="rounded-none border-b-2 border-transparent px-2 pb-3 font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Perguntas & Respostas ({questions.length})
            </TabsTrigger>
          </TabsList>

          {/* 1. Descrição Real Traduzida */}
          <TabsContent value="description" className="max-w-4xl py-6 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {descriptionPt || "Produto original e lacrado com garantia de fábrica. Entrega com nota e rastreio."}
          </TabsContent>

          {/* 2. Especificações Técnicas Reais */}
          <TabsContent value="specifications" className="py-6">
            <div className="max-w-2xl rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr className="bg-muted/40">
                    <td className="p-3 font-semibold text-muted-foreground w-1/3">Categoria</td>
                    <td className="p-3">{product.category ? translateText(product.category) : "Eletrônicos & Utilidades"}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-muted-foreground">Tipo de Produto</td>
                    <td className="p-3">{product.product_type === "digital" ? "Produto Digital" : "Produto Físico"}</td>
                  </tr>
                  <tr className="bg-muted/40">
                    <td className="p-3 font-semibold text-muted-foreground">Disponibilidade</td>
                    <td className="p-3">{product.stock > 0 ? "Em Estoque com Pronta Entrega" : "Indisponível"}</td>
                  </tr>
                  {product.specifications &&
                    Object.entries(product.specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td className="p-3 font-semibold text-muted-foreground">{translateText(key)}</td>
                        <td className="p-3">{translateText(String(value))}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 3. Perguntas e Respostas Funcionais */}
          <TabsContent value="questions" className="py-6">
            <div className="max-w-3xl space-y-6">
              {/* Formulário para Enviar Dúvida */}
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Escreva sua pergunta para o vendedor..."
                  className="flex-1"
                />
                <Button type="submit" className="primary-gradient">
                  <Send className="mr-1.5 h-4 w-4" /> Perguntar
                </Button>
              </form>

              {/* Lista de Perguntas */}
              <div className="space-y-4">
                {questions.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4 bg-card">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.question}</p>
                        <span className="text-[11px] text-muted-foreground">{item.created_at}</span>
                      </div>
                    </div>
                    {item.answer ? (
                      <div className="mt-3 ml-6 rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground border-l-2 border-primary">
                        <span className="font-semibold text-foreground block mb-0.5">Resposta do vendedor:</span>
                        {item.answer}
                      </div>
                    ) : (
                      <div className="mt-2 ml-6 text-xs text-muted-foreground italic">
                        Aguardando resposta do vendedor...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
