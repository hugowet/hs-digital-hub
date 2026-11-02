import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mayViewSaleProfit } from './seller-profit';

export const getSellerPromotions = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ storeId: z.string().uuid(), search: z.string().max(100).default(''), page: z.number().int().min(0).default(0), activeOnly: z.boolean().default(false) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!mayViewSaleProfit(String(context.claims.email ?? ''))) throw new Error('Acesso não permitido.');
    const db = context.supabase;
    const store = await db.from('stores').select('id').eq('id', data.storeId).eq('owner_id', context.userId).eq('status', 'approved').maybeSingle();
    if (store.error || !store.data) throw new Error('Loja não autorizada.');
    const [promos, settings] = await Promise.all([
      db.from('hs_promotions').select('product_id,regular_price,promo_price,margin_share,ends_at').gt('ends_at', new Date().toISOString()),
      db.from('platform_settings').select('commission_rate').eq('id', true).single(),
    ]);
    if (promos.error) throw promos.error;
    if (settings.error) throw settings.error;
    let query = db.from('products').select('id,title,image_url,price,supplier_cost,supplier_cost_currency,is_active', { count: 'exact' }).eq('store_id', data.storeId).eq('supplier', 'amazon');
    const search = data.search.replace(/[%_]/g, '').trim();
    if (search) query = query.ilike('title', `%${search}%`);
    if (data.activeOnly) query = query.in('id', (promos.data ?? []).map(p => p.product_id));
    const products = await query.order('title').range(data.page * 24, data.page * 24 + 23);
    if (products.error) throw products.error;
    return { products: products.data ?? [], promotions: promos.data ?? [], total: products.count ?? 0, activeCount: promos.data?.length ?? 0, commission: Number(settings.data.commission_rate) };
  });

export const saveSellerPromotions = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ storeId: z.string().uuid(), productIds: z.array(z.string().uuid()).min(1).max(50), share: z.union([z.literal(0.25), z.literal(0.35), z.literal(0.5)]), remove: z.boolean().default(false) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc('manage_seller_hs_promotions', { _store_id: data.storeId, _product_ids: data.productIds, _share: data.share, _remove: data.remove });
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });