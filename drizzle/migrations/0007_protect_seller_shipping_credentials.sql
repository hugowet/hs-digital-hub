REVOKE ALL ON public.seller_shipping_integrations FROM authenticated;
GRANT SELECT (id, store_id, provider, status, last_error, created_at, updated_at) ON public.seller_shipping_integrations TO authenticated;
GRANT ALL ON public.seller_shipping_integrations TO service_role;