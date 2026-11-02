import { describe, expect, it } from 'vitest';
import { promotionEstimate, PROMOTION_LIMIT, PROMOTION_DAYS } from './hs-promotion-rules';
describe('promoções financiadas pela margem', () => {
  it('usa 25% da margem, não do preço', () => expect(promotionEstimate(100,60,0.12,0.25)).toEqual({price:92.05,profit:21}));
  it('usa 35% da margem', () => expect(promotionEstimate(100,60,0.12,0.35)).toEqual({price:88.87,profit:18.21}));
  it('usa 50% da margem', () => expect(promotionEstimate(100,60,0.12,0.5)).toEqual({price:84.1,profit:14.01}));
  it('bloqueia custo desconhecido', () => expect(promotionEstimate(100,null,0.12,0.5)).toBeNull());
  it('bloqueia prejuízo', () => expect(promotionEstimate(60,55,0.12,0.5)).toBeNull());
  it('bloqueia percentuais fora das três opções', () => expect(promotionEstimate(100,60,0.12,0.75)).toBeNull());
  it('limita a 50 produtos', () => expect(PROMOTION_LIMIT).toBe(50));
  it('dura 15 dias', () => expect(PROMOTION_DAYS).toBe(15));
});