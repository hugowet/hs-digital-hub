import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getSellerCarousel, saveSellerCarousel, setSellerCarouselSlot } from '@/lib/seller-carousel.functions';
import { brl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export function SellerCarouselTab({ storeId }: { storeId: string }) {
  const read = useServerFn(getSellerCarousel);
  const save = useServerFn(saveSellerCarousel);
  const saveSlot = useServerFn(setSellerCarouselSlot);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [carouselOnly, setCarouselOnly] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data, error, isPending, refetch } = useQuery({ queryKey: ['seller-carousel', storeId, search, page, carouselOnly], queryFn: () => read({ data: { storeId, search, page, carouselOnly } }) });
  const apply = async (include: boolean, ids: string[] = selected) => {
    setBusy(true);
    try {
      const count = await save({ data: { storeId, productIds: ids, include } });
      setSelected([]);
      await Promise.all([qc.invalidateQueries({ queryKey: ['seller-carousel'] }), qc.invalidateQueries({ queryKey: ['amazon-best-sellers'] })]);
      toast.success(`${count} produto${count === 1 ? '' : 's'} ${include ? 'adicionado' : 'retirado'}${count === 1 ? '' : 's'} ${include ? 'ao' : 'do'} carrossel.`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  const changeSlot = async (productId: string, value: string) => {
    setBusy(true);
    try {
      await saveSlot({ data: { storeId, productId, slot: value ? Number(value) : null } });
      await Promise.all([qc.invalidateQueries({ queryKey: ['seller-carousel'] }), qc.invalidateQueries({ queryKey: ['amazon-best-sellers'] })]);
      toast.success(value ? `Produto colocado na posição ${value}.` : 'Posição removida.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Gerenciar Mais vendidos" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold"><TrendingUp className="size-5 text-primary" />Mais vendidos</h2>
      <span className="text-sm text-muted-foreground">{data?.carouselIds.length ?? 0} no carrossel</span>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
      <div className="relative min-w-0 flex-1 basis-48"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Buscar produtos para Mais vendidos" placeholder="Buscar produtos Amazon" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      <Button variant={carouselOnly ? 'secondary' : 'outline'} aria-pressed={carouselOnly} onClick={() => { setCarouselOnly(!carouselOnly); setPage(0); setSelected([]); }}>{carouselOnly ? 'Ver todos os produtos' : 'Ver só os ativos no carrossel'}</Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{selected.length} selecionados</span>
      <Button disabled={!selected.length || busy} onClick={() => apply(true)}><Plus />Adicionar ao carrossel</Button>
      <Button variant="outline" disabled={!selected.length || busy} onClick={() => apply(false)}><Trash2 />Retirar do carrossel</Button>
      {busy && <span role="status" className="text-sm text-muted-foreground">Salvando…</span>}
    </div>
    {error && <div role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : 'Não foi possível carregar.'}<Button variant="ghost" onClick={() => refetch()}>Tentar novamente</Button></div>}
    {isPending && <p role="status" className="text-sm text-muted-foreground">Carregando produtos…</p>}
    {data && !data.products.length && <p className="py-8 text-center text-muted-foreground">Nenhum produto encontrado.</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data?.products.map(p => {
        const checked = selected.includes(p.id);
        const included = data.carouselIds.includes(p.id);
        return <label key={p.id} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3">
          <Checkbox aria-label={`Selecionar ${p.title}`} checked={checked} disabled={busy || (!checked && selected.length >= 50)} onCheckedChange={value => setSelected(ids => value === true ? [...ids, p.id] : ids.filter(id => id !== p.id))} />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">{p.image_url && <img src={p.image_url} alt="" className="size-14 shrink-0 rounded object-contain" loading="lazy" />}<p className="line-clamp-3 text-sm font-medium">{p.title}</p></div>
            <p className="text-sm font-bold">{brl(Number(p.price))}</p>
            <p className={`mt-1 text-xs ${included ? 'text-success' : 'text-muted-foreground'}`}>{included ? 'No carrossel' : 'Fora do carrossel'}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span>Posição na vitrine:</span>
              <select aria-label={`Posição de ${p.title}`} className="rounded border border-input bg-background px-2 py-1" disabled={busy || (!p.is_active || p.stock <= 0)} value={data.slots?.[p.id] ?? ''} onChange={e => void changeSlot(p.id, e.target.value)}>
                <option value="">Automática</option>
                {Array.from({ length: 50 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}º{i === 0 ? ' (destaque)' : ''}</option>)}
              </select>
            </div>
            <Button type="button" size="sm" variant={included ? 'destructive' : 'default'} className="mt-2" disabled={busy} onClick={e => { e.preventDefault(); void apply(!included, [p.id]); }}>{included ? <><Trash2 />Retirar</> : <><Plus />Adicionar</>}</Button>
            {(!p.is_active || p.stock <= 0) && <p className="mt-1 text-xs text-destructive">{!p.is_active ? 'Produto não publicado' : 'Estoque acabou'}</p>}
          </div>
        </label>;
      })}
    </div>
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" size="icon" aria-label="Página anterior de Mais vendidos" disabled={page === 0 || isPending} onClick={() => setPage(page - 1)}><ChevronLeft /></Button>
      <span className="text-sm">Página {page + 1} · {data?.total ?? 0} produtos</span>
      <Button variant="outline" size="icon" aria-label="Próxima página de Mais vendidos" disabled={isPending || (page + 1) * 24 >= (data?.total ?? 0)} onClick={() => setPage(page + 1)}><ChevronRight /></Button>
    </div>
  </section>;
}