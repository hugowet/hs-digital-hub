CREATE OR REPLACE FUNCTION public.search_catalog_supplier_ids(_groups jsonb, _category text, _min numeric, _max numeric, _free boolean, _sort text, _offset integer, _limit integer, _supplier text)
RETURNS SETOF uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '8s' AS $$
DECLARE
  _where text := 'is_active AND supplier_variant_parent_id IS NULL';
  _g jsonb; _parts text; _order text;
BEGIN
  IF _supplier IS NOT NULL AND _supplier NOT IN ('cj','amazon') THEN RAISE EXCEPTION 'Invalid supplier'; END IF;
  FOR _g IN SELECT * FROM jsonb_array_elements(coalesce(_groups,'[]'::jsonb)) LOOP
    SELECT string_agg(format('catalog_search_text ILIKE %L', '%' || t || '%'), ' OR ') INTO _parts FROM jsonb_array_elements_text(_g) t WHERE length(t) > 0;
    IF _parts IS NOT NULL THEN _where := _where || ' AND (' || _parts || ')'; END IF;
  END LOOP;
  IF _supplier IS NOT NULL THEN _where := _where || format(' AND supplier = %L', _supplier); END IF;
  IF _category IS NOT NULL THEN _where := _where || format(' AND category = %L', _category); END IF;
  IF _min IS NOT NULL THEN _where := _where || format(' AND price >= %s', _min); END IF;
  IF _max IS NOT NULL THEN _where := _where || format(' AND price <= %s', _max); END IF;
  IF _free THEN _where := _where || ' AND (free_shipping OR price >= 79)'; END IF;
  _order := CASE _sort WHEN 'price-asc' THEN 'price ASC, id' WHEN 'price-desc' THEN 'price DESC, id' ELSE 'sold_count DESC, id' END;
  IF jsonb_array_length(coalesce(_groups,'[]'::jsonb)) = 0 THEN
    RETURN QUERY EXECUTE format('SELECT id FROM public.products WHERE %s ORDER BY %s OFFSET %s LIMIT %s', _where, _order, greatest(_offset,0), least(greatest(_limit,1),100));
  ELSE
    RETURN QUERY EXECUTE format('WITH m AS MATERIALIZED (SELECT id, price, sold_count FROM public.products WHERE %s) SELECT id FROM m ORDER BY %s OFFSET %s LIMIT %s', _where, _order, greatest(_offset,0), least(greatest(_limit,1),100));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS products_supplier_admin_pages_idx ON public.products (supplier, created_at DESC, id);
CREATE INDEX IF NOT EXISTS products_admin_pages_idx ON public.products (created_at DESC, id);