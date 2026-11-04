import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const shirt = '57d9fb51-cc36-42bb-8b1c-9a183d14bca9';
const store = '8bc94f28-2c61-4de2-97d3-596d80ebae06';
const env = readFileSync('.env', 'utf8');
function config(name: string) {
  const value = env.split('\n').find(line => line.startsWith(`${name}=`))?.split('=').slice(1).join('=').replace(/^['"]|['"]$/g, '');
  if (!value) throw new Error('Missing test configuration');
  return value;
}
const url = config('VITE_SUPABASE_URL');
const key = config('VITE_SUPABASE_PUBLISHABLE_KEY');
const session = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, 'utf8')).session;
async function rpc(name: string, body: unknown, authenticated = true) {
  const headers: Record<string,string> = { apikey: key, 'Content-Type': 'application/json' };
  if (authenticated) headers.Authorization = `Bearer ${session.access_token}`;
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { ok: response.ok, status: response.status, data: await response.json() };
}
function product() {
  return JSON.parse(execFileSync('lovable', ['supabase', 'query', `select price,stock from products where id='${shirt}'`], { encoding: 'utf8' }))[0];
}

describe('carousel decisions', () => {
  it('owner can remove and add the shirt without changing its price or stock', async () => {
    const before = product();
    const body = { _store_id: store, _product_ids: [shirt] };
    try {
      expect((await rpc('manage_amazon_carousel', { ...body, _include: false })).ok).toBe(true);
      expect((await rpc('amazon_carousel_product_ids', {})).data).not.toContain(shirt);
      expect((await rpc('manage_amazon_carousel', { ...body, _include: true })).ok).toBe(true);
      expect((await rpc('amazon_carousel_product_ids', {})).data).toContain(shirt);
      expect(product()).toEqual(before);
    } finally { await rpc('manage_amazon_carousel', { ...body, _include: true }); }
  }, 40000);
  it('signed-out callers cannot change the shop carousel', async () => {
    expect((await rpc('manage_amazon_carousel', { _store_id: store, _product_ids: [shirt], _include: false }, false)).ok).toBe(false);
  }, 40000);
  it('CJ products cannot be added to the Amazon carousel', async () => {
    const [cj] = JSON.parse(execFileSync('lovable', ['supabase', 'query', `select id from products where store_id='${store}' and supplier='cj' limit 1`], { encoding: 'utf8' }));
    expect(cj?.id).toBeTruthy();
    const result = await rpc('manage_amazon_carousel', { _store_id: store, _product_ids: [cj.id], _include: true });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  }, 40000);
  it('owner cannot change a different store', async () => {
    const result = await rpc('manage_amazon_carousel', { _store_id: '00000000-0000-0000-0000-000000000001', _product_ids: [shirt], _include: false });
    expect(result.status).toBe(403);
  }, 40000);
});