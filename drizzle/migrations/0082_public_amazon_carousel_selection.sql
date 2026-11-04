CREATE OR REPLACE FUNCTION public.amazon_carousel_product_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT p.id FROM public.products p LEFT JOIN public.amazon_carousel_controls c ON c.product_id=p.id
 WHERE p.is_active AND p.stock>0 AND p.supplier='amazon' AND (c.included IS NULL OR c.included)
 ORDER BY CASE WHEN c.included THEN 0 WHEN p.id='57d9fb51-cc36-42bb-8b1c-9a183d14bca9'::uuid THEN 1 ELSE 2 END,
 p.sold_count DESC NULLS LAST,p.id LIMIT 50;
$$;
REVOKE EXECUTE ON FUNCTION public.amazon_carousel_product_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.amazon_carousel_product_ids() TO anon,authenticated,service_role;