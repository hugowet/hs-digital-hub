import { describe, expect, it } from 'vitest';
import { amazonPricePatch, extractAmazonOfferPrice } from './amazon-price';
const html = (price: string, asin='B012345678') => `<input id="ASIN" value="${asin}"><div id="corePrice_feature_div"><span class="a-price a-text-price"><span class="a-offscreen">R$ 999,00</span></span><span class="a-price"><span class="a-offscreen">R$ ${price}</span></span></div>`;
describe('preço confirmado Amazon', () => {
  it('aceita oferta principal e ignora preço riscado', () => expect(extractAmazonOfferPrice(html('80,00'),'B012345678')).toBe(80));
  it('ignora identidade diferente e valores sem comprovação', () => { expect(extractAmazonOfferPrice(html('80,00'),'B098765432')).toBeNull(); expect(extractAmazonOfferPrice(html('4,99'),'B012345678')).toBeNull(); });
  it('acompanha subida e queda mantendo regra de margem R$15', () => { expect(amazonPricePatch(80).price).toBe(94.9); expect(amazonPricePatch(60).price).toBe(74.9); expect(amazonPricePatch(null)).toEqual({}); });
});