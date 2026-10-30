CREATE OR REPLACE FUNCTION public.daily_storefront_selection(p_offset integer DEFAULT 0, p_limit integer DEFAULT 48, p_day date DEFAULT ((now() AT TIME ZONE 'America/Boa_Vista')::date)) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public SET statement_timeout='5s' AS $$
WITH chosen AS (
 SELECT coalesce((SELECT day FROM public.storefront_daily_ranking WHERE day=p_day LIMIT 1),(SELECT max(day) FROM public.storefront_daily_ranking WHERE day<=p_day)) AS day
), nationals AS (
 SELECT p.id,row_number() OVER (ORDER BY p.sold_count DESC,p.rating DESC,p.id) AS n
 FROM public.products p JOIN public.stores s ON s.id=p.store_id
 WHERE p.supplier='amazon' AND p.supplier_variant_parent_id IS NULL AND p.is_active AND s.status='approved' AND p.stock>0 AND p.price>0
), ranked AS (
 SELECT r.product_id AS id,r.position,p.supplier
 FROM public.storefront_daily_ranking r JOIN public.products p ON p.id=r.product_id JOIN public.stores s ON s.id=p.store_id, chosen c
 WHERE r.day=c.day AND p.is_active AND s.status='approved' AND (p.stock>0 OR p.product_type='digital')
), internationals AS (
 SELECT id,row_number() OVER (ORDER BY position) AS n FROM ranked WHERE supplier='cj'
), mixed AS (
 SELECT id,n+((n-1)/4) AS slot,0 AS tie FROM nationals
 UNION ALL SELECT id,n*5 AS slot,1 AS tie FROM internationals
), unknown_origin AS (
 SELECT id,row_number() OVER (ORDER BY position) AS n FROM ranked WHERE supplier IS DISTINCT FROM 'cj' AND supplier IS DISTINCT FROM 'amazon'
), complete AS (
 SELECT * FROM mixed UNION ALL SELECT id,coalesce((SELECT max(slot) FROM mixed),0)+n,2 FROM unknown_origin
), page AS (
 SELECT id,slot,tie FROM complete ORDER BY slot,tie,id OFFSET greatest(0,least(coalesce(p_offset,0),100000)) LIMIT greatest(1,least(coalesce(p_limit,48),100))
)
SELECT jsonb_build_object('ids',coalesce((SELECT jsonb_agg(id ORDER BY slot,tie,id) FROM page),'[]'::jsonb),'total',(SELECT count(*) FROM complete),'day',p_day);
$$;