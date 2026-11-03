import { describe, it, expect } from "vitest";
import { extractSelectedAmazonOffer, confirmedSelectedAmazonStock } from "./amazon-selected-offer";

const page = (extra = '') => `<div id="corePriceDisplay_desktop_feature_div" data-csa-c-asin="B0CFGFYP27"><span class="a-price"><span class="a-offscreen">R$ 26,99</span></span></div><div id="availability">Somente 6 em estoque.</div><input id="add-to-cart-button">${extra}`;
const options = `<script>{"variationValues":{"size_name":["Galaxy A34 5G","Galaxy A14 5G"]}}</script><div id="inline-twister-row-size_name"><li data-asin="B0CFGFYP27" data-initiallyselected="true"><span class="swatch-title-text">Galaxy A34 5G</span></li><li data-asin="B0C8ZL11T4"><span class="swatch-title-text">Galaxy A14 5G</span></li></div>`;
describe('automatic selected Amazon availability', () => {
  it('confirms only the exact A34 offer, never the A14 sibling', () => {
    const result = extractSelectedAmazonOffer(page(options), 'B0CFGFYP27');
    expect(result.stock).toBe(1);
    expect(result.variations[0]?.options).toEqual(['Galaxy A34 5G']);
    expect(result.variations[0]?.asin).toBe('B0CFGFYP27');
  });
  it('blocks options without selected evidence', () => {
    expect(extractSelectedAmazonOffer(page(options.replace('data-initiallyselected="true"','')), 'B0CFGFYP27').stock).toBe(0);
  });
  it('blocks mismatched identities', () => {
    expect(extractSelectedAmazonOffer(page(options), 'B0C8ZL11T4').stock).toBe(0);
  });
  it('blocks explicit sold out pages', () => {
    expect(extractSelectedAmazonOffer(page(options).replace('Somente 6 em estoque.', 'Atualmente indisponível.'), 'B0CFGFYP27').stock).toBe(0);
  });
  it('blocks template or multiple option inventory', () => {
    expect(confirmedSelectedAmazonStock('available', [{ options: ['M'], availability: 'unconfirmed' }])).toBe(0);
    expect(confirmedSelectedAmazonStock('available', [{ options: ['M','G'], availability: 'confirmed', asin: 'B0CFGFYP27' }])).toBe(0);
  });
  it('confirms a product without variations automatically', () => {
    expect(extractSelectedAmazonOffer(page(), 'B0CFGFYP27').stock).toBe(1);
  });
});