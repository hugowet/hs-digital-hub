import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Minus, Plus, ShieldCheck, ShoppingCart, Star, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackAbandonedCart } from "@/lib/abandoned-cart";
import { useCart } from "@/lib/cart";
import { fetchProduct } from "@/lib/catalog";
import { brl, compact } from "@/lib/format";

export const Route = createFileRoute("/produto/$productId")({
  head: () => ({ meta: [
    { title: "Detalhes do produto · HS Digital" },
    { name: "description", content: "Veja fotos, opções, especificações e informações do produto na HS Digital." },
    { property: "og:title", content: "Produto · HS Digital" },
    { property: "og:description", content: "Confira todos os detalhes deste produto na HS Digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const { data: product, isLoading } = useQuery({ queryKey: ["product", productId], queryFn: () => fetchProduct(productId) });
  const images = useMemo(() => product ? [...new Set([product.image_url, ...(product.gallery_urls ?? [])].filter(Boolean))] as string[] : [], [product]);

  if (isLoading) return <Shell><div className="h-[520px] animate-pulse bg-muted" /></Shell>;
  if (!product) return <Shell><div className="py-24 text-center"><h1 className="text-2xl font-bold">Produto não encontrado</h1><Button asChild className="mt-4"><Link to="/">Voltar às ofertas</Link></Button></div></Shell>;

  const addProduct = () => {
    add({ productId: product.id, title: product.title, price: Number(product.price), imageUrl: product.image_url, storeId: product.store_id, storeName: product.stores?.name ?? "Loja parceira", freeShipping: product.free_shipping, stock: product.stock }, quantity);
    void trackAbandonedCart(product.id, quantity);
    toast.success("Adicionado ao carrinho");
  };

  return <Shell>
    <nav className="mb-5 flex items-center gap-1 text-xs text-muted-foreground"><Link to="/" className="hover:text-primary">Início</Link><ChevronRight className="h-3 w-3" /><span className="truncate">{product.title}</span></nav>
    <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="grid gap-3 sm:grid-cols-[76px_1fr]">
        <div className="order-2 flex gap-2 sm:order-1 sm:flex-col">{images.map((url, index) => <button key={`${url}-${index}`} onClick={() => setSelectedImage(index)} aria-label={`Ver imagem ${index + 1}`} className={`aspect-square w-16 overflow-hidden rounded-md border-2 ${selectedImage === index ? "border-primary" : "border-border"}`}><img src={url} alt="" width={96} height={96} className="h-full w-full object-cover" /></button>)}</div>
        <div className="group order-1 aspect-square overflow-hidden bg-muted sm:order-2"><img src={images[selectedImage] ?? product.image_url ?? ""} alt={product.title} width={900} height={900} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /></div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Novo · {compact(product.sold_count)} vendidos</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">{product.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span className="flex items-center gap-1 font-semibold text-primary">{Number(product.rating).toFixed(1)} <Star className="h-4 w-4 fill-primary" /></span><span className="text-muted-foreground">{product.reviews_count} avaliações</span></div>
        <div className="mt-6"><p className="text-3xl font-bold text-primary">{brl(Number(product.price))}</p>{product.compare_at_price && <p className="mt-1 text-sm text-muted-foreground line-through">{brl(Number(product.compare_at_price))}</p>}</div>
        <div className="mt-6 flex items-center gap-3 border-y border-border py-4"><BadgeCheck className="h-8 w-8 text-success" /><div><p className="font-semibold">Vendedor Destaque</p><p className="text-sm text-muted-foreground">{product.stores?.name ?? "Loja parceira"} · alta reputação</p></div></div>
        {product.variations?.map((variation) => <div key={variation.name} className="mt-5"><p className="text-sm font-semibold">{variation.name}: <span className="font-normal text-muted-foreground">{selections[variation.name] ?? "Escolha uma opção"}</span></p><div className="mt-2 flex flex-wrap gap-2">{variation.options.map((option) => <Button key={option} variant={selections[variation.name] === option ? "default" : "outline"} size="sm" onClick={() => setSelections((current) => ({ ...current, [variation.name]: option }))}>{option}</Button>)}</div></div>)}
        <div className="mt-6 flex items-center gap-3"><p className="text-sm font-semibold">Quantidade</p><div className="flex items-center rounded-md border border-border"><Button variant="ghost" size="icon" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir quantidade"><Minus /></Button><span className="w-10 text-center text-sm">{quantity}</span><Button variant="ghost" size="icon" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))} aria-label="Aumentar quantidade"><Plus /></Button></div><span className="text-xs text-muted-foreground">{product.stock} disponíveis</span></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button variant="outline" size="lg" onClick={addProduct}><ShoppingCart /> Adicionar ao Carrinho</Button><Button size="lg" className="primary-gradient" onClick={() => { addProduct(); navigate({ to: "/carrinho" }); }}>Comprar Agora</Button></div>
        <div className="mt-5 grid gap-2 text-sm text-muted-foreground"><p className="flex items-center gap-2"><Truck className="h-4 w-4 text-success" />{product.free_shipping ? "Frete grátis" : "Entrega calculada no checkout"}</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Compra protegida pela HS Digital</p></div>
      </div>
    </section>
    <section className="mt-12 border-t border-border pt-8"><Tabs defaultValue="description"><TabsList className="h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="description">Descrição Detalhada</TabsTrigger><TabsTrigger value="specifications">Especificações Técnicas</TabsTrigger><TabsTrigger value="questions">Perguntas & Respostas</TabsTrigger></TabsList><TabsContent value="description" className="max-w-3xl py-6 text-sm leading-7 text-muted-foreground">{product.description_long ?? product.description ?? "Informações detalhadas disponíveis com o vendedor."}</TabsContent><TabsContent value="specifications" className="py-6"><dl className="max-w-2xl divide-y divide-border">{Object.entries(product.specifications ?? {}).map(([key, value]) => <div key={key} className="grid grid-cols-2 py-3 text-sm"><dt className="font-medium">{key}</dt><dd className="text-muted-foreground">{value}</dd></div>)}</dl></TabsContent><TabsContent value="questions" className="py-6"><div className="max-w-2xl border-l-2 border-primary pl-4"><p className="font-semibold">Este produto tem garantia?</p><p className="mt-1 text-sm text-muted-foreground">Envie sua pergunta ao vendedor. A resposta aparecerá aqui para ajudar outros compradores.</p></div></TabsContent></Tabs></section>
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main><SiteFooter /></div>;
}