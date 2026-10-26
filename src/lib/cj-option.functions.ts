import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';

export const confirmCjOption=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator(input=>z.object({parentId:z.string().uuid(),productId:z.string().uuid()}).parse(input))
  .handler(async({data,context})=>{
    const parent=await context.supabase.from('products').select('id,store_id,supplier_variant_parent_id').eq('id',data.parentId).eq('supplier','cj').eq('is_active',true).maybeSingle();
    if(parent.error || !parent.data)throw new Error('Produto não disponível.');
    const root=parent.data.supplier_variant_parent_id??parent.data.id;
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    const option=await supabaseAdmin.from('products').select('id,store_id,supplier_variant_id').eq('id',data.productId).eq('store_id',parent.data.store_id).eq('supplier','cj').or(`id.eq.${root},supplier_variant_parent_id.eq.${root}`).maybeSingle();
    if(option.error || !option.data?.supplier_variant_id)throw new Error('Opção não disponível.');
    const {cjRequest,getCjAccessToken}=await import('./suppliers.server');
    const {cjConfirmedVariantStock}=await import('./cj-variants');
    const token=await getCjAccessToken(supabaseAdmin,option.data.store_id);
    const stock=cjConfirmedVariantStock(await cjRequest(`/product/stock/queryByVid?vid=${encodeURIComponent(option.data.supplier_variant_id)}`,token));
    const save=await supabaseAdmin.from('products').update({stock,is_active:stock>0,supplier_last_synced_at:new Date().toISOString()}).eq('id',option.data.id);
    if(save.error)throw new Error('Não foi possível atualizar o estoque.');
    if(stock<=0)throw new Error('Esta numeração está sem estoque na CJ. Escolha outra opção.');
    return {productId:option.data.id,stock};
  });