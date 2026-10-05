REVOKE EXECUTE ON FUNCTION public.create_marketplace_order(jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(jsonb, jsonb) TO service_role;
COMMENT ON FUNCTION public.create_marketplace_order(jsonb, jsonb) IS 'DEPRECATED and unavailable to shoppers: fixed shipping replaced by create_marketplace_order_v2 with validated quotes.';