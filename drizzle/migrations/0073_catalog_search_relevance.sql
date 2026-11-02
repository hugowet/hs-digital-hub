CREATE OR REPLACE FUNCTION public.search_catalog_supplier_ids(_groups jsonb, _category text, _min numeric, _max numeric, _free boolean, _sort text, _offset integer, _limit integer, _supplier text)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '8s'
AS $function$
DECLARE
  _where text := 'is_active AND supplier_variant_parent_id IS NULL';
  _g jsonb; _parts text; _order text; _clean jsonb := '[]'::jsonb;
BEGIN
  IF _supplier IS NOT NULL AND _supplier NOT IN ('cj','amazon') THEN RAISE EXCEPTION 'Invalid supplier'; END IF;
  -- Sanitize every term so it is safe inside a regular expression.
  FOR _g IN SELECT * FROM jsonb_array_elements(coalesce(_groups,'[]'::jsonb)) LOOP
    SELECT coalesce(jsonb_agg(c), '[]'::jsonb) INTO _g FROM (
      SELECT DISTINCT trim(regexp_replace(lower(t), '[^a-z0-9 -]', '', 'g')) c FROM jsonb_array_elements_text(_g) t
    ) s WHERE length(c) >= 2;
    IF jsonb_array_length(_g) > 0 THEN _clean := _clean || jsonb_build_array(_g); END IF;
  END LOOP;
  -- Words must start at a word boundary: "phone" no longer matches "headphone", "fone" no longer matches "microfone".
  FOR _g IN SELECT * FROM jsonb_array_elements(_clean) LOOP
    SELECT string_agg(format('catalog_search_text ~ %L', '\m' || t), ' OR ') INTO _parts FROM jsonb_array_elements_text(_g) t;
    IF _parts IS NOT NULL THEN _where := _where || ' AND (' || _parts || ')'; END IF;
  END LOOP;
  IF _supplier IS NOT NULL THEN _where := _where || format(' AND supplier = %L', _supplier); END IF;
  IF _category IS NOT NULL THEN _where := _where || format(' AND category = %L', _category); END IF;
  IF _min IS NOT NULL THEN _where := _where || format(' AND price >= %s', _min); END IF;
  IF _max IS NOT NULL THEN _where := _where || format(' AND price <= %s', _max); END IF;
  IF _free THEN _where := _where || ' AND (free_shipping OR price >= 79)'; END IF;
  IF jsonb_array_length(_clean) = 0 THEN
    _order := CASE _sort WHEN 'price-asc' THEN 'price ASC, id' WHEN 'price-desc' THEN 'price DESC, id' ELSE 'sold_count DESC, id' END;
    RETURN QUERY EXECUTE format('SELECT id FROM public.products WHERE %s ORDER BY %s OFFSET %s LIMIT %s', _where, _order, greatest(_offset,0), least(greatest(_limit,1),100));
  END IF;
  _order := CASE _sort WHEN 'price-asc' THEN 'price ASC, score DESC, id' WHEN 'price-desc' THEN 'price DESC, score DESC, id' ELSE 'score DESC, sold_count DESC, id' END;
  -- Relevance: the product itself (term at the start of the title) beats accessories "para celular",
  -- which beat category matches, which beat description-only matches.
  RETURN QUERY EXECUTE format($q$
    WITH m AS MATERIALIZED (
      SELECT id, price, sold_count,
        trim(regexp_replace(public.normalize_catalog_text(title), '[^a-z0-9]+', ' ', 'g')) AS nt,
        public.normalize_catalog_text(coalesce(category,'')) AS nc
      FROM public.products WHERE %s
    ), s AS (
      SELECT m.id, m.price, m.sold_count,
        coalesce((SELECT sum(gs) FROM (
          SELECT max(CASE
            WHEN m.nt ~ ('^([a-z0-9-]+ )?' || t || '\M') THEN 60
            WHEN m.nt ~ ('\m' || t) AND NOT m.nt ~ ('\m(para|pra|p|for|de|do|da|com|compativel|with)( [a-z0-9]+)? ' || t) THEN 30
            WHEN m.nt ~ ('\m' || t) THEN 12
            WHEN m.nc ~ ('\m' || t) THEN 8
            ELSE 0 END) gs
          FROM jsonb_array_elements($1) WITH ORDINALITY g(arr, i), jsonb_array_elements_text(g.arr) t
          GROUP BY g.i) x), 0)
        - CASE WHEN split_part(m.nt, ' ', 1) IN ('capa','capas','capinha','case','pelicula','suporte','carregador','cabo','protetor','adaptador','porta','moldura','display','tela','bateria','bolsa','fone','fones','microfone','caneta','oculos','luminaria','kit','anel','pulseira','chaveiro','estojo','tripe','bastao')
            AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements($1) g2, jsonb_array_elements_text(g2) t2 WHERE t2 = split_part(m.nt, ' ', 1))
          THEN 45 ELSE 0 END AS score
      FROM m
    )
    SELECT id FROM s ORDER BY %s OFFSET %s LIMIT %s$q$,
    _where, _order, greatest(_offset,0), least(greatest(_limit,1),100)) USING _clean;
END $function$;