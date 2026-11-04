import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getSellerCarousel = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ storeId: z.string().uuid(), search: z.string().max(100).default(''), page: z.number().int().min(0).max(1000).default(0), carouselOnly: z.boolean().default(false) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const store = await db.from('stores').select('id').eq('id', data.storeId).eq('owner_id', context.userId).eq('status', 'approved').maybeSingle();
    if (store.error || !store.data) throw new Error('Loja não autorizada.');
    const selection = await db.rpc('amazon_carousel_product_ids');
    if (selection.error) throw new Error(selection.error.message);
    const ids = selection.data ?? [];
    let query = db.from('products').select('id,title,image_url,price,stock,is_active', { count: 'exact' }).eq('store_id', data.storeId).eq('supplier', 'amazon');
    const search = data.search.replace(/[%_]/g, '').trim();
    if (search) query = query.ilike('title', `%${search}%`);
    if (data.carouselOnly) query = query.in('id', ids);
    const result = await query.order('title').range(data.page * 24, data.page * 24 + 23);
    if (result.error) throw new Error(result.error.message);
    const products = result.data ?? [];
    const paths = [...new Set(products.flatMap(p => p.image_url && !/^https?:\/\//.test(p.image_url) ? [p.image_url] : []))];
    const signed = paths.length ? await db.storage.from('product-images').createSignedUrls(paths, 3600) : null;
    const urls = new Map(paths.map((path, i) => [path, signed?.data?.[i]?.signedUrl]));
    return { products: products.map(p => ({ ...p, image_url: p.image_url ? urls.get(p.image_url) ?? p.image_url : null })), total: result.count ?? 0, carouselIds: ids };
  });

export const saveSellerCarousel = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ storeId: z.string().uuid(), productIds: z.array(z.string().uuid()).min(1).max(50), include: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc('manage_amazon_carousel', { _store_id: data.storeId, _product_ids: data.productIds, _include: data.include });
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });