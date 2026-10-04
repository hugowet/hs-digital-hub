CREATE OR REPLACE FUNCTION public.reprice_cj_products_brl(
  _store_id uuid,
  _usd_brl_rate numeric,
  _margin_percent numeric
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated integer;
BEGIN
  IF _usd_brl_rate < 2 OR _usd_brl_rate > 15 THEN
    RAISE EXCEPTION 'Invalid USD/BRL exchange rate';
  END IF;
  IF _margin_percent < 0 OR _margin_percent > 1000 THEN
    RAISE EXCEPTION 'Invalid supplier margin';
  END IF;

  UPDATE public.products
  SET price = round(supplier_cost * _usd_brl_rate * (1 + _margin_percent / 100), 2),
      supplier_cost_currency = 'USD',
      supplier_exchange_rate = _usd_brl_rate,
      supplier_exchange_rate_at = now()
  WHERE store_id = _store_id
    AND supplier = 'cj'
    AND supplier_cost IS NOT NULL
    AND supplier_cost > 0;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;

REVOKE ALL ON FUNCTION public.reprice_cj_products_brl(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reprice_cj_products_brl(uuid, numeric, numeric) TO service_role;