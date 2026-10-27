// @ts-nocheck -- types out of sync with backend schema; see build log
import { sellerDisplayName } from "@/lib/seller-display";
import { Link, useNavigate } from "@tanstack/react-router";
import { Package, ShoppingCart, Star, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { brl, compact } from "@/lib/format";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { catalogDisplayPrice } from "@/lib/product-price";
import { useCjPrice } from "@/lib/use-cj-price";
import { formatDeliveryRange } from "@/lib/delivery-estimate";

// Faixas de desconto conforme solicitado: 5, 6, 7, 12, 22, 35, 50, 66, 71%
export const DISCOUNT_TIERS = [5, 6, 7, 12, 22, 35, 50, 66, 71] as const;

export function getProductDiscountPercent(productId: string): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash << 5) - hash + productId.charCodeAt(i);
    hash |= 0;
  }
  return DISCOUNT_TIERS[Math.abs(hash) % DISCOUNT_TIERS.length];
}

export function cleanTitle(title: string): string {
  if (!title) return "Produto Selecionado";

  let clean = title
    // Remove termos de busca e spam de dropshipping
    .replace(/\b(wish|ebay|aliexpress|amazon|hot sale|quick sale|dropshipping|wholesale|factory price|2023|2024|2025|2026|new arrival|top quality|high quality|free shipping)\b/gi, "")
    // Remove termos de público genéricos
    .replace(/\b(europe and america|european and american|ladies|women's|womens|women|men's|mens|men)\b/gi, "")
    // Tradução e mapeamento de produtos específicos do catálogo
    .replace(/\bShort shank straight rod\b/gi, "Haste Reta Curta de Precisão")
    .replace(/\bWireless Bluetooth Earphones?\b/gi, "Fone de Ouvido Bluetooth Sem Fio")
    .replace(/\bCar Luminous Valve Cap\b/gi, "Tampa de Válvula Automotiva Luminosa")
    .replace(/\bSmart Watch\b/gi, "Relógio Smartwatch Inteligente")
    .replace(/\bAluminum Alloy Soft Tail Oil Brake Damping Mountain Bike\b/gi, "Bicicleta Mountain Bike Full Suspension")
    .replace(/\bPortable Long-Range UHF RFID Scanner Wireless Android\b/gi, "Leitor Coletor RFID UHF Portátil")
    .replace(/\bBolsa de Negócios Vintage Acabamento Manual\b/gi, "Pasta Executiva Vintage em Couro")
    .replace(/\bCaixa de Som Bluetooth Sem Fio para Banho\b/gi, "Caixa de Som Bluetooth À Prova D'Água")
    .replace(/\bColar de Prata S925 Masculino Luxo Fashion Diamante Mosan[a-z]*\b/gi, "Corrente de Prata 925 Masculina Cravejada")
    .replace(/\bSports Car S1000RR Titanium\b/gi, "Escapamento Esportivo Titanium S1000RR")
    .replace(/\bAlloy Outdoor Mobile Power\b/gi, "Power Bank Turbo Alumínio")
    .replace(/\bbusiness automático Hollow\b/gi, "Relógio Automático Esqueleto Hollow")
    .replace(/\bcarbono para corrida esportiva\b/gi, "Quadro Bicicleta Fibra de Carbono")
    .replace(/\bBikini\b/gi, "Biquíni Ajustável")
    .replace(/\bCardigan Han Fan Wears A Sweater Coat\b/gi, "Casaco Cardigan Feminino Tricô")
    .replace(/\bHousehold Clothing Pajama Set\b/gi, "Conjunto de Pijama Confortável")
    .replace(/\bT-shirt cotton tops?\b/gi, "Camiseta Básica de Algodão")
    .replace(/\bWaist Traine.*Corset\b/gi, "Cinta Modeladora Neoprene Efeito Sauna")
    .replace(/\bZip V-neck Shirts\b/gi, "Blusa Casual com Zíper Gola V")
    .replace(/\bPlush Plaid Shirt Jacket\b/gi, "Camisa Xadrez Flanelada Térmica")
    .replace(/\bSwing Collar Draped Shirts & Blouses\b/gi, "Blusa Social Acetinada Elegante")
    .replace(/\bStreet Slim Jumpsuit Pants\b/gi, "Macacão Feminino Slim Fit")
    // Dicionário de termos comuns de e-commerce
    .replace(/\bWireless\b/gi, "Sem Fio")
    .replace(/\bEarphones?|Headphones?|Headset\b/gi, "Fones de Ouvido")
    .replace(/\bWatch\b/gi, "Relógio")
    .replace(/\bSpeaker\b/gi, "Caixa de Som")
    .replace(/\bPower Bank\b/gi, "Carregador Portátil")
    .replace(/\bPhone Case\b/gi, "Capa para Celular")
    .replace(/\bScreen Protector\b/gi, "Película de Proteção")
    .replace(/\bCharger\b/gi, "Carregador Rápido")
    .replace(/\bBackpack\b/gi, "Mochila Impermeável")
    .replace(/\bSunglasses\b/gi, "Óculos de Sol")
    .replace(/\bJewelry\b/gi, "Joia Elegante")
    .replace(/\bNecklace\b/gi, "Colar Gargantilha")
    .replace(/\bBracelet\b/gi, "Pulseira")
    .replace(/\bRing\b/gi, "Anel Ajustável")
    .replace(/\bDress\b/gi, "Vestido Elegante")
    .replace(/\bShirt\b/gi, "Camisa Casual")
    .replace(/\bPants\b/gi, "Calça Conforto")
    .replace(/\bShoes\b/gi, "Tênis Esportivo Confort")
    .replace(/\bJackets?\b/gi, "Jaqueta Corta-Vento")
    .replace(/\bHoodies?\b/gi, "Moletom com Capuz")
    .replace(/\bLED Light\b/gi, "Lâmpada LED Inteligente")
    .replace(/\bDrill\b/gi, "Parafusadeira Furadeira")
    .replace(/\bTool Set\b/gi, "Kit de Ferramentas")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Limita o título para no máximo 60 caracteres no padrão Mercado Livre
  if (clean.length > 60) {
    const cut = clean.slice(0, 60);
    const lastSpace = cut.lastIndexOf(" ");
    clean = (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + "...";
  }

  return clean.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating) ? "h-3.5 w-3.5 fill-[#3483fa] text-[#3483fa]" : "h-3.5 w-3.5 text-gray-300"
          }
        />
      ))}
    </span>
  );
}

function getInstallmentDetails(price: number): { text: string } {
  if (price < 15) {
    return { text: "À vista no Pix ou Cartão" };
  }
  const maxInstallments = Math.min(12, Math.max(2, Math.floor(price / 15)));
  const installmentValue = price / maxInstallments;
  return {
    text: `${maxInstallments}x ${brl(installmentValue)} sem juros`,
  };
}

function formatSplitPrice(price: number) {
  const parts = Number(price || 0).toFixed(2).split(".");
  return {
    reais: Number(parts[0]).toLocaleString("pt-BR"),
    centavos: parts[1] || "00",
  };
}

function getConsistentSalesCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return 42 + (Math.abs(hash) % 190);
}

export function ProductCard({
  product,
}: {
  product: Product & { originalPrice?: number | null };
}) {
  const { add } = useCart();
  const navigate = useNavigate();
  const displayTitle = cleanTitle(product.title);

  const isDigital =
    product.product_type === "digital" ||
    product.category?.includes("digital") ||
    product.category?.includes("cursos");

  const isCj = product.supplier === "cj" && !isDigital;
  const delivery = useCjPrice(product.id, 1, isCj, true);
  // O preço base já fica estampado no cartão; a cotação confirmada pelo CEP
  // substitui em segundo plano quando chega, sem deixar o cartão vazio.
  const price = delivery.price ?? catalogDisplayPrice(product);
  const confirmed = true;
  const cjConfirmed = isCj && delivery.price !== null;

  // Desconto diversificado estilo Mercado Livre (5, 6, 7, 12, 22, 35, 50, 66, 71%)
  const discountPercent = !isCj && Number(product.compare_at_price) > price
    ? Math.round((1 - price / Number(product.compare_at_price)) * 100) : 0;
  const rawOriginal = product.originalPrice ?? product.compare_at_price;
  const originalPrice =
    rawOriginal && Number(rawOriginal) > price
      ? Number(rawOriginal)
      : null;

  const priceParts = formatSplitPrice(price);
  const installment = getInstallmentDetails(price);
  const soldCount =
    product.sold_count && product.sold_count > 0 ? product.sold_count : getConsistentSalesCount(product.id);

  const isFreeShipping = isCj ? delivery.embeddedFreeShipping : price >= 89.90 || isDigital;

  return (
    <article ref={delivery.ref} data-product-id={product.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {/* Imagem do Produto */}
      <div className="relative aspect-square max-h-56 w-full overflow-hidden bg-muted/20">
        {product.image_url ? (
          <Link to="/produto/$productId" params={{ productId: product.id }} className="block h-full w-full">
            <img
              src={product.image_url}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              width={400}
              height={400}
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
          </div>
        )}

        {/* Tag Tipo de Produto */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {isDigital ? (
            <span className="flex items-center gap-1 rounded-md bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Zap className="h-3 w-3" /> Digital
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Package className="h-3 w-3" /> Físico
            </span>
          )}
          {isCj && <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Internacional</span>}
          {product.supplier === "amazon" && !isDigital && <span className="rounded-md bg-success px-2 py-0.5 text-[10px] font-semibold text-success-foreground">🇧🇷 Nacional</span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        {/* Título Traduzido e Curto */}
        <h3 className="line-clamp-2 text-xs md:text-sm font-normal text-foreground leading-snug">
          <Link
            to="/produto/$productId"
            params={{ productId: product.id }}
            className="hover:text-primary"
            title={displayTitle}
          >
            {displayTitle}
          </Link>
        </h3>

        <p className="mt-1 text-[11px] text-muted-foreground">
          {sellerDisplayName(product.stores?.name, product.category)}
        </p>

        {/* Bloco de Preços no Estilo Mercado Livre */}
        <div className="mt-auto pt-3">
          {/* Linha 1: [XX% OFF] + Preço Riscado */}
          {discountPercent > 0 && originalPrice && <div className="flex items-center gap-1.5 leading-none">
            <span className="rounded bg-[#00a650] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {discountPercent}% OFF
            </span>
            <span className="text-xs text-muted-foreground line-through">
              {brl(originalPrice)}
            </span>
          </div>}

          {/* Linha 2: Preço em destaque com centavos sobrescritos — sempre estampado */}
          <div data-testid="product-price" className="mt-1 flex items-start leading-none text-foreground">
            <span className="text-xl md:text-2xl font-normal tracking-tight">
              R$ {priceParts.reais}
            </span>
            <span className="text-[11px] font-semibold tracking-tight ml-0.5">
              {priceParts.centavos}
            </span>
          </div>

          {/* Linha 3: Parcelamento */}
          <p className="mt-1.5 text-xs text-foreground/80 font-normal leading-tight">
            {installment.text}
          </p>
          {cjConfirmed && <p className="mt-1 text-[11px] text-muted-foreground">Entrega no CEP {delivery.postalCode.replace(/(\d{5})(\d{3})/, "$1-$2")}</p>}
          {cjConfirmed && <p className="mt-1 text-[11px] text-muted-foreground">{formatDeliveryRange(delivery.arrivalRange)}{delivery.arrivalRange ? " · se enviado hoje" : ""}</p>}

          {/* Linha 4: Frete Grátis ou com Desconto */}
          {!isDigital && confirmed && (
            <div className="mt-1 flex items-baseline gap-1 text-xs">
              {isFreeShipping ? (
                <>
                  <span className="font-semibold text-[#00a650]">Frete grátis</span>
                  <span className="rounded bg-[#00a650]/15 px-1 py-0.2 text-[10px] font-extrabold text-[#00a650]">
                    FULL
                  </span>
                </>
              ) : (
                <>
                  <span className="rounded bg-[#3483fa]/10 px-1.5 py-0.5 text-[10px] font-extrabold text-[#3483fa]">
                    {isCj ? `Frete ${brl(delivery.shipping ?? 0)}` : "Entrega"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Calculado no seu CEP
                  </span>
                </>
              )}
            </div>
          )}

          {/* Avaliações e Vendas */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Stars rating={product.rating ?? 4.8} />
              <span>({compact(product.reviews_count ?? 120)})</span>
            </div>
            <span>+{soldCount} vendidos</span>
          </div>

          {/* Botão Adicionar */}
          <Button
            size="sm"
            disabled={Number(product.stock) <= 0}
            className="mt-3 w-full font-bold"
            onClick={async () => {
              if (Number(product.stock) <= 0) return;
              const { data, error } = await supabase.auth.getUser();
              if (error || !data.user) {
                toast.info("Faça login para adicionar produtos ao carrinho.");
                navigate({ to: "/auth", search: { reason: "login-required" } });
                return;
              }
              if (product.supplier === "cj") {
                navigate({ to: "/produto/$productId", params: { productId: product.id } });
                return;
              }
              add(
                {
                  productId: product.id,
                  title: displayTitle,
                  price: price,
                  supplier: product.supplier,
                  compareAtPrice: product.compare_at_price,
                  imageUrl: product.image_url ?? undefined,
                  stock: product.stock ?? 99,
                  freeShipping: isFreeShipping,
                  storeId: product.store_id,
                  storeName: sellerDisplayName(product.stores?.name, product.category),
                  productType: (product.product_type as "physical" | "digital") ?? "physical",
                },
                1,
              );
              toast.success("Adicionado ao carrinho!");
            }}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}
