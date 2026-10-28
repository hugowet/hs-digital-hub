import { describe, expect, it } from 'vitest';
import { productMargin } from './product-margin';
import { mayViewSaleProfit } from './seller-profit';
describe('margem privada no card',()=>{
  it('limita à conta de Hugo',()=>{ expect(mayViewSaleProfit('hugohug12ou@gmail.com')).toBe(true); expect(mayViewSaleProfit('cliente@example.com')).toBe(false); expect(mayViewSaleProfit(null)).toBe(false); });
  it('desconta custo e comissão, sem inventar frete',()=>expect(productMargin(275.90,196.50,0.12)).toBe(46.29));
  it('acompanha aumentos e reduções',()=>{expect(productMargin(100,70,0.12)).toBe(18); expect(productMargin(80,60,0.12)).toBe(10.4);});
  it('não inventa custo ausente',()=>expect(productMargin(100,null,0.12)).toBeNull());
});