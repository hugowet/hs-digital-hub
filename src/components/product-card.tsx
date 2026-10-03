import { Link } from "@tanstack/react-router";
import { ShoppingCart, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackAbandonedCart } from "@/lib/abandoned-cart";
import { brl, compact } from "@/lib/format";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog";

// Dicionário de tradução e limpeza para produtos importados da CJ
const TRANSLATIONS: Record<string, string> = {
  "smart watch": "Smartwatch Relógio Inteligente",
  "smartwatch": "Smartwatch Inteligente",
  "wireless headphones": "Fone de Ouvido Sem Fio Bluetooth",
  "wireless earphones": "Fone de Ouvido Bluetooth Sem Fio",
  "earphones": "Fones de Ouvido",
  "bluetooth": "Bluetooth",
  "phone case": "Capa para Celular",
  "fast charging": "Carregamento Rápido",
  "charger": "Carregador",
  "cable": "Cabo",
  "led light": "Luz LED Luminária",
  "night light": "Luminária Noturna LED",
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
  "fashion": "",
  "creative": "",
  "men": "Masculino",
  "women": "Feminino"
};

function translateTitle(title: string): string {
  if (!title) return "";
  let cleanTitle = title;
  for (const [en, pt] of Object.entries(TRANSLATIONS)) {
    const regex = new RegExp(`\\b${en}\\b`, "gi");
    cleanTitle = cleanTitle.replace(regex, pt);
  }
  cleanTitle = cleanTitle.replace(/\s+/g, " ").replace(/,\s*,/g, ",").trim();
  return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating)
              ? "h-3.5 w-3.5 fill-primary text-primary"
              : "h-3.5 w-3.5 text-muted-foreground/40"
          }
        />
      ))}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const titlePt = translateTitle(product.title);

  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : 0;

  return (
    <article className="group surface-card flex flex-col overflow-hidden rounded-lg border transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Imagem do Produto no tamanho proporcional padrão */}
      <div className="relative aspect-square max-h-56 w-full overflow-hidden bg-muted">
        {product.image_url && (
          <Link to="/produto/$productId" params={{ productId: product.id }} className="block h-full w-full">
            <img
              src={product.image_url}
              alt={titlePt}
              loading="lazy"
              width={400}
              height={400}
              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            -{discount}%
          </span>
        )}
        {product.free_shipping && (
          <span className="absolute bottom-2 left-2 rounded-md bg-success px-2 py-0.5 text-[11px] font-semibold text-success-foreground">
            Frete Grátis
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-xs md:text-sm font-medium leading-snug text-foreground">
          <Link to="/produto/$productId" params={{ productId: product.id }} className="hover:text-primary">
            {titlePt}
          </Link>
        </h3>
        <p className="text-[11px] text-muted-foreground">{product.stores?.name ?? "Loja parceira"}</p>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-base md:text-lg font-bold text-primary">
              {brl(Number(product.price))}
            </span>
            {discount > 0 && (
              <span className="text-[11px] text-muted-foreground line-through">
                {brl(Number(product.compare_at_price))}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Stars rating={Number(product.rating)} />
            <span>{Number(product.rating).toFixed(1)}</span>
            <span>· {compact(product.sold_count)} vendidos</span>
          </div>

          <Button
            size="sm"
            onClick={() => {
              add({
                productId: product.id,
                title: titlePt,
                price: Number(product.price),
                imageUrl: product.image_url,
                storeId: product.store_id,
                storeName: product.stores?.name ?? "Loja parceira",
                freeShipping: product.free_shipping,
                productType: product.product_type,
                stock: product.stock,
              });
              void trackAbandonedCart(product.id, 1);
            }}
            disabled={product.stock <= 0}
            className="mt-2.5 w-full primary-gradient text-xs"
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1" /> {product.stock > 0 ? "Adicionar" : "Sem estoque"}
          </Button>
        </div>
      </div>
    </article>
  );
}
