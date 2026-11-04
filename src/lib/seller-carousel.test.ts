import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

const owner = 'c624eb5f-4c7e-4dae-8d92-e02983b77378';
const shirt = '57d9fb51-cc36-42bb-8b1c-9a183d14bca9';
const store = '8bc94f28-2c61-4de2-97d3-596d80ebae06';
function check(body: string, user = owner) {
  const query = `BEGIN; SELECT set_config('request.jwt.claim.sub','${user}',true); DO $$ ${body} $$; ROLLBACK;`;
  expect(() => execFileSync('lovable', ['supabase', 'query', query], { stdio: 'pipe', timeout: 30000 })).not.toThrow();
}

describe('carousel decisions', () => {
  it('owner can remove and add the shirt without changing its price or stock', () => {
    check(`DECLARE before_price numeric; before_stock integer; BEGIN
      SELECT price,stock INTO before_price,before_stock FROM public.products WHERE id='${shirt}';
      PERFORM public.manage_amazon_carousel('${store}',ARRAY['${shirt}'::uuid],false);
      IF EXISTS(SELECT 1 FROM public.amazon_carousel_product_ids() id WHERE id='${shirt}'::uuid) THEN RAISE EXCEPTION 'Removed shirt still displayed'; END IF;
      PERFORM public.manage_amazon_carousel('${store}',ARRAY['${shirt}'::uuid],true);
      IF NOT EXISTS(SELECT 1 FROM public.amazon_carousel_product_ids() id WHERE id='${shirt}'::uuid) THEN RAISE EXCEPTION 'Added shirt missing'; END IF;
      IF NOT EXISTS(SELECT 1 FROM public.products WHERE id='${shirt}' AND price=before_price AND stock=before_stock) THEN RAISE EXCEPTION 'Product altered'; END IF;
    END;`);
  }, 40000);
  it('another account cannot change the shop carousel', () => {
    check(`DECLARE denied boolean:=false; BEGIN
      BEGIN PERFORM public.manage_amazon_carousel('${store}',ARRAY['${shirt}'::uuid],false); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
      IF NOT denied THEN RAISE EXCEPTION 'Other owner was allowed'; END IF;
    END;`, '10ba6e31-4b9e-43e2-b063-18c43ac483c7');
  }, 40000);
  it('CJ products cannot be added to the Amazon carousel', () => {
    check(`DECLARE cj uuid; denied boolean:=false; BEGIN
      SELECT id INTO cj FROM public.products WHERE store_id='${store}' AND supplier='cj' LIMIT 1;
      IF cj IS NULL THEN RAISE EXCEPTION 'CJ fixture missing'; END IF;
      BEGIN PERFORM public.manage_amazon_carousel('${store}',ARRAY[cj],true); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
      IF NOT denied THEN RAISE EXCEPTION 'CJ was allowed'; END IF;
    END;`);
  }, 40000);
});