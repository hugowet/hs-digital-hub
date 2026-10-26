CREATE TABLE IF NOT EXISTS public.storefront_daily_ranking (
  day date NOT NULL,
  position integer NOT NULL,
  product_id uuid NOT NULL,
  PRIMARY KEY (day, position)
);
GRANT ALL ON public.storefront_daily_ranking TO service_role;
ALTER TABLE public.storefront_daily_ranking ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS products_storefront_eligible_idx
  ON public.products (store_id, category, id)
  WHERE is_active AND supplier_variant_parent_id IS NULL AND price > 0;
CREATE INDEX IF NOT EXISTS products_catalog_popular_idx
  ON public.products (sold_count DESC, id)
  WHERE is_active AND supplier_variant_parent_id IS NULL;
CREATE INDEX IF NOT EXISTS products_catalog_category_popular_idx
  ON public.products (category, sold_count DESC, id)
  WHERE is_active AND supplier_variant_parent_id IS NULL;

CREATE OR REPLACE FUNCTION public.refresh_storefront_daily_ranking(
  p_day date DEFAULT ((now() AT TIME ZONE 'America/Boa_Vista'))::date
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '180s'
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('storefront_daily_ranking')) THEN
    RETURN -1;
  END IF;

  DELETE FROM public.storefront_daily_ranking WHERE day = p_day OR day < p_day - 2;

  INSERT INTO public.storefront_daily_ranking (day, position, product_id)
  WITH eligible AS (
    SELECT p.id, coalesce(nullif(p.category, ''), 'geral') AS category
    FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.supplier_variant_parent_id IS NULL AND p.is_active AND s.status = 'approved'
      AND (p.stock > 0 OR p.product_type = 'digital') AND p.price > 0
  ), sales AS (
    SELECT oi.product_id, sum(oi.quantity) AS lifetime_sales,
      sum(oi.quantity) FILTER (WHERE pt.paid_at >= (p_day::timestamp AT TIME ZONE 'America/Boa_Vista') - interval '30 days') AS recent_sales
    FROM public.order_items oi
    JOIN public.payment_transactions pt ON pt.order_id = oi.order_id AND pt.store_id = oi.store_id
    JOIN public.orders o ON o.id = oi.order_id
    WHERE pt.status = 'approved' AND pt.paid_at < (p_day::timestamp AT TIME ZONE 'America/Boa_Vista')
      AND o.status NOT IN ('cancelled', 'refunded', 'payment_failed')
    GROUP BY oi.product_id
  ), scored AS (
    SELECT e.*, coalesce(s.recent_sales, 0) AS recent_sales, coalesce(s.lifetime_sales, 0) AS lifetime_sales,
      row_number() OVER (PARTITION BY e.category ORDER BY coalesce(s.recent_sales, 0) DESC, coalesce(s.lifetime_sales, 0) DESC, e.id) AS popularity_rank
    FROM eligible e LEFT JOIN sales s ON s.product_id = e.id
  ), diversified AS (
    SELECT *, row_number() OVER (PARTITION BY category ORDER BY
      CASE WHEN recent_sales > 0 THEN 0 WHEN lifetime_sales > 0 THEN 1 ELSE 2 END,
      CASE WHEN lifetime_sales > 0 THEN (popularity_rank - 1) / 8 ELSE 0 END,
      md5(id::text || p_day::text), id) AS category_position
    FROM scored
  )
  SELECT p_day, row_number() OVER (ORDER BY category_position, md5(category || p_day::text), category, id), id
  FROM diversified;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_storefront_daily_ranking(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_storefront_daily_ranking(date) TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_storefront_daily_ranking_if_missing()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_day date := ((now() AT TIME ZONE 'America/Boa_Vista'))::date;
BEGIN
  IF EXISTS (SELECT 1 FROM public.storefront_daily_ranking WHERE day = v_day) THEN
    RETURN 0;
  END IF;
  RETURN public.refresh_storefront_daily_ranking(v_day);
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_storefront_daily_ranking_if_missing() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_storefront_daily_ranking_if_missing() TO service_role;

CREATE OR REPLACE FUNCTION public.daily_storefront_selection(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 48,
  p_day date DEFAULT ((now() AT TIME ZONE 'America/Boa_Vista'))::date
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '5s'
AS $$
WITH chosen AS (
  SELECT coalesce(
    (SELECT day FROM public.storefront_daily_ranking WHERE day = p_day LIMIT 1),
    (SELECT max(day) FROM public.storefront_daily_ranking WHERE day <= p_day)
  ) AS day
), page AS (
  SELECT r.product_id AS id, r.position
  FROM public.storefront_daily_ranking r, chosen c
  WHERE r.day = c.day
  ORDER BY r.position
  OFFSET greatest(0, least(coalesce(p_offset, 0), 100000))
  LIMIT greatest(1, least(coalesce(p_limit, 48), 100))
)
SELECT jsonb_build_object(
  'ids', coalesce((SELECT jsonb_agg(id ORDER BY position) FROM page), '[]'::jsonb),
  'total', (SELECT count(*) FROM public.storefront_daily_ranking r, chosen c WHERE r.day = c.day),
  'day', p_day
);
$$;
GRANT EXECUTE ON FUNCTION public.daily_storefront_selection(integer, integer, date) TO anon, authenticated, service_role;

SELECT cron.schedule('storefront-daily-ranking', '1 4,6 * * *', $$SELECT public.refresh_storefront_daily_ranking_if_missing();$$);

SELECT public.refresh_storefront_daily_ranking();