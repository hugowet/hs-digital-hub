import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

describe('AdSense privacy defaults', () => {
  it('denies advertising storage and personalization before any choice', () => {
    const window: { dataLayer?: unknown[][] } = {};
    const sandbox = { window, navigator: {}, localStorage: { getItem: () => null }, Date };
    Object.defineProperty(sandbox, 'dataLayer', { get: () => window.dataLayer });
    runInNewContext(readFileSync(new URL('./adsense-consent-defaults.js', import.meta.url), 'utf8'), sandbox);
    const defaults = window.dataLayer?.[0]?.[2];
    expect(defaults).toMatchObject({ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  });
});