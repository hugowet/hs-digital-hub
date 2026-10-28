import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mayViewSaleProfit } from './seller-profit';
import { productMargin } from './product-margin';

export const getProductMargins = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ productIds: z.array(z.string().uuid()).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!mayViewSaleProfit(String(context.claims.email ?? ''))) return [];
    const db = context.supabase;
    const { data: stores, error: storeError } = await db.from('stores').select('id').eq('owner_id',context.userId);
    if (storeError) throw storeError;
    if (!stores?.length || !data.productIds.length) return [];
    const [products, platform] = await Promise.all([
      db.from('products').select('id,price,supplier_cost,supplier_cost_currency,supplier_exchange_rate,supplier').in('store_id',stores.map(s=>s.id)).in('id',data.productIds),
      db.from('platform_settings').select('commission_rate').eq('id',true).single(),
    ]);
    if (products.error) throw products.error;
    if (platform.error) throw platform.error;
    return (products.data ?? []).map(p => {
      const cost = p.supplier_cost_currency === 'USD' ? Number(p.supplier_exchange_rate) > 0 && p.supplier_cost != null ? Number(p.supplier_cost)*Number(p.supplier_exchange_rate) : null : p.supplier_cost_currency === 'BRL' || p.supplier === 'amazon' ? p.supplier_cost == null ? null : Number(p.supplier_cost) : null;
      return { productId:p.id, price:Number(p.price), margin:productMargin(Number(p.price),cost,Number(platform.data.commission_rate)) };
    });
  });