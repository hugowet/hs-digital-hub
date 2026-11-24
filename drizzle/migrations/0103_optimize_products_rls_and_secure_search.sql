DROP POLICY IF EXISTS "seller reads own products" ON public.products;
CREATE POLICY "seller reads own products" ON public.products FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.owner_id = (SELECT auth.uid()))
  OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));
DROP POLICY IF EXISTS "seller updates own products" ON public.products;
CREATE POLICY "seller updates own products" ON public.products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.owner_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "seller deletes own products" ON public.products;
CREATE POLICY "seller deletes own products" ON public.products FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.owner_id = (SELECT auth.uid())));

ALTER TABLE public.products SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.02);

CREATE OR REPLACE FUNCTION public.search_catalog_ids(_groups jsonb, _category text, _min numeric, _max numeric, _free boolean, _sort text, _offset integer, _limit integer)
 RETURNS SETOF uuid LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'public' SET statement_timeout TO '8s'
AS $function$
DECLARE
  _where text := 'is_active AND supplier_variant_parent_id IS NULL';
  _terms text[] := '{}'; _g jsonb; _parts text; _t text; _n int := 0; _order text;
BEGIN
  FOR _g IN SELECT * FROM jsonb_array_elements(coalesce(_groups,'[]'::jsonb)) LOOP
    _parts := NULL;
    FOR _t IN SELECT jsonb_array_elements_text(_g) LOOP
      IF length(_t) > 0 THEN
        _n := _n + 1; _terms := _terms || ('%' || _t || '%');
        _parts := coalesce(_parts || ' OR ', '') || 'catalog_search_text ILIKE $1[' || _n::int || ']';
      END IF;
    END LOOP;
    IF _parts IS NOT NULL THEN _where := _where || ' AND (' || _parts || ')'; END IF;
  END LOOP;
  _where := _where || ' AND ($2::text IS NULL OR category = $2) AND ($3::numeric IS NULL OR price >= $3) AND ($4::numeric IS NULL OR price <= $4) AND (NOT coalesce($5,false) OR free_shipping OR price >= 79)';
  _order := CASE _sort WHEN 'price-asc' THEN 'price ASC, id' WHEN 'price-desc' THEN 'price DESC, id' ELSE 'sold_count DESC, id' END;
  RETURN QUERY EXECUTE
    'WITH m AS MATERIALIZED (SELECT id, price, sold_count FROM products WHERE ' || _where || ') SELECT id FROM m ORDER BY ' || _order || ' OFFSET $6 LIMIT $7'
    USING _terms, _category, _min, _max, _free, greatest(_offset,0), least(greatest(_limit,1),100);
END $function$;