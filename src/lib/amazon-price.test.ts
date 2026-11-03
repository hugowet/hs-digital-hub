import { describe, expect, it } from 'vitest';
import { amazonPricePatch, extractAmazonOfferPrice, extractExactAmazonPrice } from './amazon-price';
const html = (price: string, asin='B012345678') => `<input id="ASIN" value="${asin}"><div id="corePrice_feature_div"><span class="a-price a-text-price"><span class="a-offscreen">R$ 999,00</span></span><span class="a-price"><span class="a-offscreen">R$ ${price}</span></span></div>`;
describe('preço confirmado Amazon', () => {
  const currentOffer = `<div id="corePriceDisplay_desktop_feature_div" data-csa-c-asin="B0CFGFYP27"><span class="a-price priceToPay"><span class="a-offscreen"> </span><span><span class="a-price-symbol">R$</span><span class="a-price-whole">26<span class="a-price-decimal">,</span></span><span class="a-price-fraction">99</span></span></span><span class="a-price a-text-price"><span class="a-offscreen">R$29,99</span></span></div>`;
  it('lê os R$26,99 da capinha no formato atual, sem input ASIN e com texto acessível vazio', () => {
    expect(extractExactAmazonPrice(currentOffer, 'B0CFGFYP27')).toBe(26.99);
  });
  it('não aceita identidade de outra variante nem identidade conflitante', () => {
    expect(extractExactAmazonPrice(currentOffer, 'B098765432')).toBeNull();
    expect(extractExactAmazonPrice(`<input id="ASIN" value="B098765432">${currentOffer}`, 'B0CFGFYP27')).toBeNull();
  });
  it('não escolhe entre preços diferentes nos dois blocos da mesma oferta', () => {
    expect(extractExactAmazonPrice(`${currentOffer}<div id="corePrice_feature_div" data-csa-c-asin="B0CFGFYP27"><span class="a-price"><span class="a-offscreen">R$25,99</span></span></div>`, 'B0CFGFYP27')).toBeNull();
  });
  it('bloqueia centavos ausentes e texto acessível divergente', () => {
    expect(extractExactAmazonPrice(currentOffer.replace('>99<', '>9<'), 'B0CFGFYP27')).toBeNull();
    expect(extractExactAmazonPrice(currentOffer.replace('a-offscreen"> </span>', 'a-offscreen">R$25,99</span>'), 'B0CFGFYP27')).toBeNull();
  });
  it('importação mantém centavos exatos, sem aumentar ou reduzir', () => {
    expect(extractExactAmazonPrice(html('59,99'), 'B012345678')).toBe(59.99);
    expect(extractExactAmazonPrice(html('1.234,56'), 'B012345678')).toBe(1234.56);
    expect(extractExactAmazonPrice(html('9,87'), 'B012345678')).toBe(9.87);
  });
  it('bloqueia preço ausente mesmo que um leitor sugira um valor', () => {
    expect(extractExactAmazonPrice('<input id="ASIN" value="B012345678"><div>Preço estimado R$ 60,00</div>')).toBeNull();
  });
  it('bloqueia ofertas ambíguas e não lê recomendações ou parcelas', () => {
    const ambiguous = html('59,99').replace('</div>', '<span class="a-price"><span class="a-offscreen">R$ 9,99</span></span></div>');
    expect(extractExactAmazonPrice(ambiguous)).toBeNull();
    expect(extractExactAmazonPrice('<input id="ASIN" value="B012345678"><div id="recommendations"><span class="a-price"><span class="a-offscreen">R$ 9,99</span></span></div>')).toBeNull();
  });
  it('recusa preço de outro produto selecionado', () => {
    expect(extractExactAmazonPrice(html('59,99'), 'B098765432')).toBeNull();
  });
  it('aceita oferta principal e ignora preço riscado', () => expect(extractAmazonOfferPrice(html('80,00'),'B012345678')).toBe(80));
  it('ignora identidade diferente e valores sem comprovação', () => { expect(extractAmazonOfferPrice(html('80,00'),'B098765432')).toBeNull(); expect(extractAmazonOfferPrice(html('4,99'),'B012345678')).toBeNull(); });
  it('acompanha subida e queda mantendo regra de margem R$15', () => { expect(amazonPricePatch(80).price).toBe(94.9); expect(amazonPricePatch(60).price).toBe(74.9); expect(amazonPricePatch(null)).toEqual({}); });
});