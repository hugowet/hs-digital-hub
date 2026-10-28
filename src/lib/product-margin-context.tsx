import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useDeliveryAddress } from './delivery-context';
import { getProductMargins } from './product-margin.functions';

const MarginContext = createContext<Array<{ productId: string; price: number; margin: number | null }>>([]);
export function ProductMarginProvider({ children }: { children: ReactNode }) {
  const { userId } = useDeliveryAddress();
  const fetchMargins = useServerFn(getProductMargins);
  const [ids,setIds] = useState<string[]>([]);
  useEffect(() => {
    if (!userId) { setIds([]); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scan = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = [...new Set(Array.from(document.querySelectorAll('[data-product-id]')).map(el=>el.getAttribute('data-product-id')).filter((id):id is string=>Boolean(id)))].slice(0,100).sort();
        setIds(old => old.join(',')===next.join(',') ? old : next);
      },200);
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body,{childList:true,subtree:true});
    scan();
    return () => { observer.disconnect(); clearTimeout(timer); };
  },[userId]);
  const result = useQuery({ queryKey:['product-private-margins',userId,ids.join(',')], enabled:Boolean(userId && ids.length), queryFn:()=>fetchMargins({data:{productIds:ids}}), staleTime:60_000, retry:false });
  return <MarginContext.Provider value={userId ? result.data ?? [] : []}>{children}</MarginContext.Provider>;
}
export function useProductMargin(productId: string) { return useContext(MarginContext).find(p=>p.productId===productId); }