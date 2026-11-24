import { describe, expect, it } from "vitest";
import type { Product } from "./catalog";
import { productBreadcrumbSchema, productSearchSchema, productShareUrl } from "./seo";

const product: Product = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  title: "Furadeira de Impacto 650W",
  price: 249.9,
  compare_at_price: null,
  stock: 4,
  category: "Ferramentas",
  image_url: "store/furadeira.jpg",
  free_shipping: false,
  rating: 0,
  reviews_count: 0,
  sold_count: 0,
  store_id: "store-id",
  stores: null,
  description: "Furadeira com mandril de 10 mm.",
  description_long: null,
  gallery_urls: [],
  specifications: { Marca: "Ferramentas HS", Modelo: "FI-650" },
  variations: [],
  product_type: "physical",
  supplier: "manual",
};

describe("dados públicos do produto para o Google", () => {
  it("usa uma imagem pública estável e informa preço e estoque reais", () => {
    const schema = productSearchSchema(product);
    expect(schema.image).toEqual([productShareUrl(product.id)]);
    expect(schema.image?.[0]).toBe(
      "https://hsdigitalmarketpla.store/api/public/product-share/123e4567-e89b-42d3-a456-426614174000",
    );
    expect(schema.offers).toMatchObject({ price: "249.90", priceCurrency: "BRL", availability: "https://schema.org/InStock" });
  });

  it("marca produto sem estoque como indisponível", () => {
    const schema = productSearchSchema({ ...product, stock: 0 });
    expect(schema.offers?.availability).toBe("https://schema.org/OutOfStock");
  });

  it("não publica oferta de preço ainda não confirmado", () => {
    const schema = productSearchSchema({ ...product, supplier: "cj" });
    expect(schema.offers).toBeUndefined();
  });

  it("usa somente a marca informada e não inventa avaliações", () => {
    const schema = productSearchSchema(product);
    expect(schema.brand).toEqual({ "@type": "Brand", name: "Ferramentas HS" });
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("review");
    expect(schema).not.toHaveProperty("specifications");
  });

  it("cria o caminho público da página inicial até o produto", () => {
    expect(productBreadcrumbSchema(product).itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Início", item: "https://hsdigitalmarketpla.store/" },
      {
        "@type": "ListItem",
        position: 2,
        name: product.title,
        item: `https://hsdigitalmarketpla.store/produto/${product.id}`,
      },
    ]);
  });
});
