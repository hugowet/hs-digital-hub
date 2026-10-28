import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mayViewSaleProfit, saleProfit } from './seller-profit';

export const getSellerSaleProfits = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid(), orderIds: z.array(z.string().uuid()).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!mayViewSaleProfit(String(context.claims.email ?? ''))) throw new Error('Acesso não permitido.');
    const db = context.supabase;
    const { data: store, error: ownerError } = await db.from('stores').select('id').eq('id', data.storeId).eq('owner_id', context.userId).maybeSingle();
    if (ownerError || !store) throw new Error('Loja não encontrada.');
    if (!data.orderIds.length) return [];
    const [items, snapshots, shipments, transactions] = await Promise.all([
      db.from('order_items').select('id,order_id,product_id,quantity,unit_price,platform_fee,seller_amount').eq('store_id', data.storeId).in('order_id', data.orderIds),
      db.from('order_item_cost_snapshots').select('order_item_id,unit_cost_brl,supplier').eq('store_id', data.storeId),
      db.from('order_shipments').select('order_id,provider,quote_id').eq('store_id', data.storeId).in('order_id', data.orderIds),
      db.from('payment_transactions').select('order_id,seller_amount,gross_amount,platform_fee').eq('store_id', data.storeId).in('order_id', data.orderIds),
    ]);
    for (const r of [items, snapshots, shipments, transactions]) if (r.error) throw r.error;
    const quoteIds = (shipments.data ?? []).flatMap(s => s.quote_id ? [s.quote_id] : []);
    // Buyer-bound quotes need privileged access only after caller and store authorization.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const quotes = quoteIds.length ? await supabaseAdmin.from('shipping_quotes').select('id,provider_payload').eq('store_id', data.storeId).in('id', quoteIds) : { data: [], error: null };
    if (quotes.error) throw quotes.error;
    return data.orderIds.flatMap(orderId => {
      const rows = (items.data ?? []).filter(i => i.order_id === orderId);
      if (!rows.length) return [];
      const shipment = shipments.data?.find(s => s.order_id === orderId);
      const payload = quotes.data?.find(q => q.id === shipment?.quote_id)?.provider_payload as Record<string, any> | undefined;
      const tx = transactions.data?.find(t => t.order_id === orderId);
      const proceeds = tx ? Number(tx.seller_amount) : rows.reduce((s, i) => s + Number(i.seller_amount), 0);
      const costs = rows.map(i => {
        const quoted = payload?.priced_items?.find((p: any) => p.product_id === i.product_id && Number(p.quantity) === i.quantity);
        const snap = snapshots.data?.find(s => s.order_item_id === i.id);
        const value = shipment?.provider === 'cj' ? quoted?.supplier_item_cost_brl : snap?.unit_cost_brl;
        return { quantity: i.quantity, unitCost: value == null ? null : Number(value) };
      });
      const freight = payload?.supplier_freight_brl != null && shipment?.provider === 'cj' ? Number(payload.supplier_freight_brl) : null;
      return [{ orderId, proceeds, gross: tx ? Number(tx.gross_amount) : rows.reduce((s,i) => s + Number(i.unit_price)*i.quantity,0), commission: tx ? Number(tx.platform_fee) : rows.reduce((s,i)=>s+Number(i.platform_fee),0), estimate: saleProfit(proceeds, costs, freight), productCost: costs.every(i => i.unitCost !== null) ? costs.reduce((s,i)=>s+Number(i.unitCost)*i.quantity,0) : null }];
    });
  });