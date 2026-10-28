import { describe, expect, it } from 'vitest';
import { mayViewSaleProfit, saleProfit } from './seller-profit';
describe('lucro exclusivo e histórico', () => {
  it('permite somente a conta solicitada', () => { expect(mayViewSaleProfit('hugohug12ou@gmail.com')).toBe(true); expect(mayViewSaleProfit('hugoet373@gmail.com')).toBe(false); });
  it('desconta quantidade e frete uma vez do repasse após comissão', () => { expect(saleProfit(220, [{ quantity: 2, unitCost: 80 }], 20)).toEqual({ products: 160, freight: 20, profit: 40 }); });
  it('não inventa custo ou frete ausente', () => { expect(saleProfit(200,[{quantity:1,unitCost:null}],0)).toBeNull(); expect(saleProfit(200,[{quantity:1,unitCost:100}],null)).toBeNull(); });
  it('mostra prejuízo sem esconder o valor negativo', () => { expect(saleProfit(80,[{quantity:1,unitCost:100}],10)?.profit).toBe(-30); });
});