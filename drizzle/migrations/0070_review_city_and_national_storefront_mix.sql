ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS city text;
CREATE OR REPLACE FUNCTION public.publish_product_review_v2(_id uuid, _product_id uuid, _author text, _rating integer, _comment text, _photo_paths text[], _city text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para avaliar.'; END IF;
 IF char_length(trim(coalesce(_city,''))) > 100 THEN RAISE EXCEPTION 'Cidade deve ter até 100 caracteres.'; END IF;
 v_id := public.publish_product_review(_id,_product_id,_author,_rating,_comment,_photo_paths);
 UPDATE public.product_reviews SET city=nullif(trim(coalesce(_city,'')),'') WHERE id=v_id AND user_id=auth.uid();
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.publish_product_review_v2(uuid,uuid,text,integer,text,text[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_product_review_v2(uuid,uuid,text,integer,text,text[],text) TO authenticated;
CREATE OR REPLACE FUNCTION public.daily_storefront_selection(p_offset integer DEFAULT 0, p_limit integer DEFAULT 48, p_day date DEFAULT ((now() AT TIME ZONE 'America/Boa_Vista')::date)) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public SET statement_timeout='5s' AS $$
WITH chosen AS (
 SELECT coalesce((SELECT day FROM public.storefront_daily_ranking WHERE day=p_day LIMIT 1),(SELECT max(day) FROM public.storefront_daily_ranking WHERE day<=p_day)) AS day
), nationals AS (
 SELECT p.id, row_number() OVER (ORDER BY p.sold_count DESC,p.rating DESC,p.id) AS n
 FROM public.products p JOIN public.stores s ON s.id=p.store_id
 WHERE p.supplier='amazon' AND p.supplier_variant_parent_id IS NULL AND p.is_active AND s.status='approved' AND p.stock>0 AND p.price>0
), others AS (
 SELECT r.product_id AS id, row_number() OVER (ORDER BY r.position) AS n
 FROM public.storefront_daily_ranking r JOIN public.products p ON p.id=r.product_id JOIN public.stores s ON s.id=p.store_id, chosen c
 WHERE r.day=c.day AND p.supplier IS DISTINCT FROM 'amazon' AND p.is_active AND s.status='approved' AND (p.stock>0 OR p.product_type='digital')
), mixed AS (
 SELECT id,n+((n-1)/4) AS slot,0 AS tie FROM nationals
 UNION ALL
 SELECT id,n*5 AS slot,1 AS tie FROM others
), page AS (
 SELECT id,slot,tie FROM mixed ORDER BY slot,tie,id
 OFFSET greatest(0,least(coalesce(p_offset,0),100000)) LIMIT greatest(1,least(coalesce(p_limit,48),100))
)
SELECT jsonb_build_object('ids',coalesce((SELECT jsonb_agg(id ORDER BY slot,tie,id) FROM page),'[]'::jsonb),'total',(SELECT count(*) FROM mixed),'day',p_day);
$$;