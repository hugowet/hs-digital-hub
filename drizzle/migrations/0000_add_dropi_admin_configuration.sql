ALTER TABLE public.supplier_integrations
  ADD COLUMN api_base_url text,
  ADD COLUMN integrator_id text,
  ADD COLUMN product_endpoint text NOT NULL DEFAULT '/products',
  ADD COLUMN product_mapping jsonb NOT NULL DEFAULT '{"items":"data","id":"id","variantId":"variant_id","sku":"sku","title":"name","description":"description","price":"price","stock":"stock","category":"category","image":"image","images":"images"}'::jsonb;

ALTER TABLE public.supplier_integrations
  ADD CONSTRAINT supplier_integrations_api_base_url_check
  CHECK (api_base_url IS NULL OR (api_base_url LIKE 'https://%' AND api_base_url NOT LIKE '% %')),
  ADD CONSTRAINT supplier_integrations_product_endpoint_check
  CHECK (left(product_endpoint, 1) = '/' AND char_length(product_endpoint) BETWEEN 2 AND 500 AND product_endpoint NOT LIKE '% %'),
  ADD CONSTRAINT supplier_integrations_product_mapping_check
  CHECK (jsonb_typeof(product_mapping) = 'object');

COMMENT ON COLUMN public.supplier_integrations.api_base_url IS 'HTTPS base URL supplied by the provider for server-side catalog synchronization.';
COMMENT ON COLUMN public.supplier_integrations.integrator_id IS 'Non-secret partner identifier supplied by the provider.';
COMMENT ON COLUMN public.supplier_integrations.product_mapping IS 'Configurable dot-path mapping from provider product payloads to marketplace fields.';

REVOKE SELECT ON public.supplier_integrations FROM authenticated;
GRANT SELECT (id, store_id, provider, status, margin_percent, auto_sync, auto_fulfill, last_catalog_sync_at, last_stock_sync_at, last_error, created_at, updated_at, api_base_url, integrator_id, product_endpoint, product_mapping)
ON public.supplier_integrations TO authenticated;