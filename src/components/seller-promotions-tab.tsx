import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ChevronLeft, ChevronRight, Flame, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSellerPromotions, saveSellerPromotions } from '@/lib/hs-promotions.functions';
import { promotionEstimate, PROMOTION_LIMIT, PROMOTION_SHARES } from '@/lib/hs-promotion-rules';
import { brl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export function SellerPromotionsTab({ storeId }: { storeId: string }) {
  const read = useServerFn(getSellerPromotions);
  const save = useServerFn(saveSellerPromotions);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [activeOnly, setActiveOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [share, setShare] = useState<0.25 | 0.35 | 0.5>(0.25);
  const [busy, setBusy] = useState(false);
  const { data, error, isPending, refetch } = useQuery({ queryKey: ['seller-promotions', storeId, search, page, activeOnly], queryFn: () => read({ data: { storeId, search, page, activeOnly } }) });
  const apply = async (remove: boolean) => {
    setBusy(true);
    try {
      const count = await save({ data: { storeId, productIds: selected, share, remove } });
      toast.success(remove ? `${count} promoções retiradas.` : `${count} produtos em promoção.`);
      setSelected([]);
      await Promise.all([qc.invalidateQueries({ queryKey: ['seller-promotions'] }), qc.invalidateQueries({ queryKey: ['hs-promotions'] }), qc.invalidateQueries({ queryKey: ['store-products'] }), qc.invalidateQueries({ queryKey: ['product-private-margins'] })]);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Flame className="size-5 text-primary" />Promoções HS</h2>
      <span className="text-sm font-semibold">{data?.activeCount ?? 0}/{PROMOTION_LIMIT} no carrossel · 15 dias</span>
    </div>
    <p className="text-sm text-muted-foreground">Desconto sobre sua margem, após custo e comissão. Lucro estimado; taxas de pagamento e frete não confirmados não estão incluídos.</p>
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
      <div className="relative min-w-0 flex-1 basis-48"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Buscar produtos Amazon para promoção" placeholder="Buscar produtos Amazon" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      <Button variant={activeOnly ? 'secondary' : 'outline'} onClick={() => { setActiveOnly(!activeOnly); setPage(0); }}>Em promoção</Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Da margem:</span>
      {PROMOTION_SHARES.map(value => <Button key={value} variant={share === value ? 'default' : 'outline'} aria-pressed={share === value} onClick={() => setShare(value)}>{value * 100}%</Button>)}
      <span className="text-sm text-muted-foreground">{selected.length} selecionados</span>
      <Button disabled={!selected.length || busy} onClick={() => apply(false)}><Flame />{busy ? 'Salvando…' : 'Aplicar promoção'}</Button>
      <Button variant="outline" disabled={!selected.length || busy} onClick={() => apply(true)}><Trash2 />Retirar</Button>
    </div>
    {error && <div role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : 'Não foi possível carregar.'}<Button variant="ghost" onClick={() => refetch()}>Tentar novamente</Button></div>}
    {isPending && <p className="text-sm text-muted-foreground">Carregando produtos…</p>}
    {data && !data.products.length && <p className="py-8 text-center text-muted-foreground">Nenhum produto encontrado.</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data?.products.map(p => {
        const promo = data.promotions.find(x => x.product_id === p.id);
        const regular = Number(promo?.regular_price ?? p.price);
        const cost = p.supplier_cost_currency === null || p.supplier_cost_currency === 'BRL' ? p.supplier_cost : null;
        const estimate = p.is_active ? promotionEstimate(regular, cost, data.commission, share) : null;
        const checked = selected.includes(p.id);
        return <label key={p.id} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3">
          <Checkbox aria-label={`Selecionar ${p.title}`} checked={checked} disabled={busy || (!checked && (!estimate && !promo || selected.length >= PROMOTION_LIMIT))} onCheckedChange={value => setSelected(ids => value === true ? [...ids, p.id] : ids.filter(id => id !== p.id))} />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">{p.image_url && <img src={p.image_url} alt="" className="size-14 shrink-0 rounded object-contain" loading="lazy" />}<p className="line-clamp-3 text-sm font-medium">{p.title}</p></div>
            <p className="text-xs text-muted-foreground">Normal: {brl(regular)} · Custo: {cost === null ? 'Não confirmado' : brl(cost)}</p>
            {estimate ? <><p className="mt-1 text-sm font-bold text-primary">Promoção: {brl(estimate.price)}</p><p className="text-sm text-success">Lucro estimado: {brl(estimate.profit)}</p></> : <p className="mt-1 text-xs text-destructive">Inativo, sem custo confirmado ou margem insuficiente</p>}
            {promo && <p className="mt-2 text-xs font-medium">Ativa: {brl(Number(promo.promo_price))} · até {new Date(promo.ends_at).toLocaleDateString('pt-BR')}</p>}
          </div>
        </label>;
      })}
    </div>
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" size="icon" aria-label="Página anterior de produtos" disabled={page === 0 || isPending} onClick={() => setPage(page - 1)}><ChevronLeft /></Button>
      <span className="text-sm">Página {page + 1} · {data?.total ?? 0} produtos</span>
      <Button variant="outline" size="icon" aria-label="Próxima página de produtos" disabled={isPending || (page + 1) * 24 >= (data?.total ?? 0)} onClick={() => setPage(page + 1)}><ChevronRight /></Button>
    </div>
  </section>;
}