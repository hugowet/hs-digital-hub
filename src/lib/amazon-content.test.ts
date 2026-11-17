import { describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";
import { complementAmazonSpecs, extractDescription, extractSpecs } from "./amazon-content";

describe("complete Amazon product data", () => {
  it("reads modern accordion specs like the Cadence sandwich maker", () => {
    const { document } = parseHTML(`<div id="productDetails_accordion_sections"><table>
      <tr><td>Nome da marca</td><td>Cadence</td></tr>
      <tr><td>Componentes incluídos</td><td>1 sanduicheira + 1 manual de instruções</td></tr>
      <tr><td>Potência</td><td>750 watts</td></tr>
      <tr><td>Voltagem</td><td>110 Volts</td></tr>
      <tr><td>Peso do item</td><td>850 g</td></tr>
      <tr><td>Dimensões do item P x L x A</td><td>7,5P x 21,5L x 21,5A centímetros</td></tr>
      <tr><td>Cor</td><td>Black</td></tr>
      <tr><td>Material</td><td>Plástico</td></tr>
    </table></div>`);
    expect(extractSpecs(document)).toEqual({ "Nome da marca": "Cadence", "Componentes incluídos": "1 sanduicheira + 1 manual de instruções", "Potência": "750 watts", "Voltagem": "110 Volts", "Peso do item": "850 g", "Dimensões do item P x L x A": "7,5P x 21,5L x 21,5A centímetros", "Cor": "Black", "Material": "Plástico" });
  });
  it("combines overview, old technical tables and labeled facts, excluding unrelated offers", () => {
    const { document } = parseHTML(`<div id="productOverview_feature_div"><table><tr><td>Cor</td><td>Preto</td></tr></table></div>
      <table id="productDetails_techSpec_section_2"><tr><th>Tamanho</th><td>G</td></tr></table>
      <div id="productFactsDesktopExpander"><div class="product-facts-detail"><div class="a-col-left">Garantia</div><div class="a-col-right">12 meses</div></div></div>
      <div id="recommendations"><table><tr><td>Marca</td><td>Outro produto</td></tr></table></div>`);
    expect(extractSpecs(document)).toEqual({ Cor: "Preto", Tamanho: "G", Garantia: "12 meses" });
  });
  it("keeps long description in addition to about-item bullets", () => {
    const { document } = parseHTML(`<div id="feature-bullets"><ul><li>Chapa antiaderente</li></ul></div><div id="productDescription"><p>Preparar 2 sanduíches ao mesmo tempo.</p></div><div id="aplus"><p>Trava de segurança na alça.</p></div>`);
    expect(extractDescription(document)).toBe("• Chapa antiaderente\nPreparar 2 sanduíches ao mesmo tempo.\nTrava de segurança na alça.");
  });
  it("complements partial specs without replacing facts or importing external review counts", () => {
    expect(complementAmazonSpecs({ Cor: "Preto" }, { Cor: "Azul", Potência: "750 watts", "Avaliações de clientes": "4,7", nested: { fake: true } })).toEqual({ Cor: "Preto", Potência: "750 watts" });
  });
});