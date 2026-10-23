CREATE INDEX IF NOT EXISTS payment_transactions_storefront_sales_idx ON public.payment_transactions (paid_at, order_id, store_id) WHERE status = 'approved';
CREATE OR REPLACE FUNCTION public.daily_storefront_selection(p_offset integer DEFAULT 0, p_limit integer DEFAULT 48, p_day date DEFAULT (now() AT TIME ZONE 'America/Boa_Vista')::date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '5s'
AS $$
WITH eligible AS (
  SELECT p.id, coalesce(nullif(p.category, ''), 'geral') AS category
  FROM public.products p JOIN public.stores s ON s.id = p.store_id
  WHERE p.is_active AND s.status = 'approved' AND (p.stock > 0 OR p.product_type = 'digital') AND p.price > 0
), sales AS (
  SELECT oi.product_id, sum(oi.quantity) AS lifetime_sales,
    sum(oi.quantity) FILTER (WHERE pt.paid_at >= (p_day::timestamp AT TIME ZONE 'America/Boa_Vista') - interval '30 days') AS recent_sales
  FROM public.order_items oi JOIN public.payment_transactions pt ON pt.order_id = oi.order_id AND pt.store_id = oi.store_id
  JOIN public.orders o ON o.id = oi.order_id JOIN eligible e ON e.id = oi.product_id
  WHERE pt.status = 'approved' AND pt.paid_at < (p_day::timestamp AT TIME ZONE 'America/Boa_Vista')
    AND o.status NOT IN ('cancelled', 'refunded', 'payment_failed') GROUP BY oi.product_id
), scored AS (
  SELECT e.*, coalesce(s.recent_sales, 0) AS recent_sales, coalesce(s.lifetime_sales, 0) AS lifetime_sales,
    row_number() OVER (PARTITION BY e.category ORDER BY coalesce(s.recent_sales, 0) DESC, coalesce(s.lifetime_sales, 0) DESC, e.id) AS popularity_rank
  FROM eligible e LEFT JOIN sales s ON s.product_id = e.id
), diversified AS (
  SELECT *, row_number() OVER (PARTITION BY category ORDER BY
    CASE WHEN recent_sales > 0 THEN 0 WHEN lifetime_sales > 0 THEN 1 ELSE 2 END,
    CASE WHEN lifetime_sales > 0 THEN (popularity_rank - 1) / 8 ELSE 0 END,
    md5(id::text || p_day::text), id) AS category_position FROM scored
), ordered AS (
  SELECT id, row_number() OVER (ORDER BY category_position, md5(category || p_day::text), category, id) AS position FROM diversified
), page AS (
  SELECT id, position FROM ordered ORDER BY position OFFSET greatest(0, least(coalesce(p_offset, 0), 100000)) LIMIT greatest(1, least(coalesce(p_limit, 48), 100))
)
SELECT jsonb_build_object('ids', coalesce((SELECT jsonb_agg(id ORDER BY position) FROM page), '[]'::jsonb), 'total', (SELECT count(*) FROM eligible), 'day', p_day);
$$;
REVOKE ALL ON FUNCTION public.daily_storefront_selection(integer, integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.daily_storefront_selection(integer, integer, date) TO anon, authenticated, service_role;