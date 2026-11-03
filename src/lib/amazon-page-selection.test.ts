import { describe, expect, it } from 'vitest';
import { extractAmazonPageCandidates, selectAmazonPageProducts, validateAmazonResultsUrl, type AmazonPageCandidate } from './amazon-page-selection';
const rows = (n: number): AmazonPageCandidate[] => Array.from({ length: n }, (_, i) => ({ url: `https://www.amazon.com.br/dp/${String(i).padStart(10, '0')}`, title: `Item ${i}`, price: 20 + i, rating: 4.6, reviews: 600, badge: '', fulfilledByAmazon: false }));
describe('Amazon results page', () => {
  it('selects exactly 15 cheapest and 15 middle-priced without duplicates', () => {
    const result = selectAmazonPageProducts(rows(60).reverse());
    expect(result.cheap).toBe(15); expect(result.moderate).toBe(15);
    expect(result.items.slice(0,15).map(p => p.price)).toEqual(Array.from({length:15},(_,i)=>20+i));
    expect(result.items.slice(15).map(p => p.price)).toEqual(Array.from({length:15},(_,i)=>50+i));
    expect(new Set(result.items.map(p=>p.url)).size).toBe(30);
  });
  it('never invents products to fill 30', () => { const result=selectAmazonPageProducts(rows(18)); expect(result.cheap).toBe(15); expect(result.moderate).toBe(3); });
  it('excludes missing prices, unsafe reputation and repeated ASINs', () => {
    const list=rows(5); expect(selectAmazonPageProducts([...list,{...list[0],price:NaN},{...list[1],rating:4.2},{...list[2],reviews:2},list[0]]).items).toHaveLength(5);
    expect(selectAmazonPageProducts([{...list[0],price:NaN},{...list[1],rating:4.2},{...list[2],reviews:2}]).items).toHaveLength(0);
  });
  it('accepts only search pages and preserves price/category filters', () => {
    expect(validateAmazonResultsUrl('https://amazon.com.br/s?k=moto&rh=p_36%3A1-6000&ref=abc')).toBe('https://www.amazon.com.br/s?k=moto&rh=p_36%3A1-6000');
    for(const url of ['https://evil.test/s','https://amazon.com.br.evil.test/s','http://amazon.com.br/s','https://amazon.com.br/dp/B012345678']) expect(()=>validateAmazonResultsUrl(url)).toThrow();
  });
  it('reads the displayed BRL price, not a crossed-out reference', () => {
    const html='<div data-component-type="s-search-result" data-asin="B012345678"><h2>Furadeira</h2><span class="a-price"><span class="a-offscreen">R$ 84,60</span></span><span class="a-price a-text-price"><span class="a-offscreen">R$ 94,00</span></span><span class="a-icon-star-small"><span class="a-icon-alt">4,6 de 5</span></span><a href="/customerReviews"><span class="a-size-base">1.200</span></a></div>';
    expect(extractAmazonPageCandidates(html)[0]).toMatchObject({price:84.60,rating:4.6,reviews:1200});
  });
  it('reads current mini stars and exact accessible review counts, ignoring installments', () => {
    const html='<div data-component-type="s-search-result" data-asin="B012345678"><h2>Furadeira</h2><span class="a-price"><span class="a-offscreen">R$ 119,00</span></span><span class="a-price a-text-price"><span class="a-offscreen">R$ 39,68</span></span><i class="a-icon-star-mini"><span class="a-icon-alt">4,7 de 5 estrelas</span></i><a aria-label="1.200 classificações"><span>(1,2 mil)</span></a></div>';
    expect(extractAmazonPageCandidates(html)[0]).toMatchObject({price:119,rating:4.7,reviews:1200});
  });
});