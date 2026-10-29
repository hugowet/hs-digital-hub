import { describe, expect, it } from 'vitest';
import { AMAZON_USER_AGENTS, amazonNavigationHeaders, amazonNextAllowedAt, assertAmazonPageReadable, amazonHourlyBudget, amazonHourlyLimitReached } from './amazon-request-policy';

describe('Amazon request safety', () => {
  it('selects navigation profiles and exact requested language/referer', () => {
    expect(amazonNavigationHeaders(() => 0)).toEqual({ 'User-Agent': AMAZON_USER_AGENTS[0], 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8', Referer: 'https://google.com.br' });
    expect(amazonNavigationHeaders(() => 0.999)['User-Agent']).toBe(AMAZON_USER_AGENTS[6]);
  });
  it('saves a mandatory delay of 5 to 12 seconds', () => {
    expect(amazonNextAllowedAt(1000, () => 0)).toBe(6000);
    expect(amazonNextAllowedAt(1000, () => 0.999999)).toBe(13000);
  });
  it('aborts on CAPTCHA before parsing product data', () => {
    expect(() => assertAmazonPageReadable({ rawHtml: '<form action="/errors/validateCaptcha">' })).toThrow('CAPTCHA');
  });
  it('aborts on Dogs error pages', () => {
    expect(() => assertAmazonPageReadable({ rawHtml: '<title>Dogs of Amazon</title>' })).toThrow('Dogs');
  });
  it('does not confuse ordinary images-amazon.com galleries with a block', () => {
    expect(() => assertAmazonPageReadable({ rawHtml: '<img src="https://images-amazon.com/images/I/product.jpg">' })).not.toThrow();
  });
  it('stops at 50 queries per hour', () => {
    expect(amazonHourlyLimitReached({ count: 49 })).toBe(false);
    expect(amazonHourlyLimitReached({ count: 50 })).toBe(true);
    expect(amazonHourlyBudget({ startedAt: 1000, count: 50 }, 3601000)).toEqual({ startedAt: 3601000, count: 0 });
  });
});