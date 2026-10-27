ALTER TABLE public.supplier_integrations DROP CONSTRAINT supplier_integrations_provider_check;
ALTER TABLE public.supplier_integrations ADD CONSTRAINT supplier_integrations_provider_check CHECK (provider IN ('cj', 'dropi', 'cj_dropshipping', 'amazon'));

INSERT INTO public.supplier_integrations (store_id, provider, status, auto_sync, auto_fulfill, margin_percent, product_endpoint, product_mapping)
VALUES ('8bc94f28-2c61-4de2-97d3-596d80ebae06', 'amazon', 'active', true, false, 0, '/s', '{"auto_cursor": 0}'::jsonb)
ON CONFLICT DO NOTHING;