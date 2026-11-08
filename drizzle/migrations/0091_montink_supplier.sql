ALTER TABLE public.products DROP CONSTRAINT products_supplier_check;
ALTER TABLE public.products ADD CONSTRAINT products_supplier_check CHECK (supplier IS NULL OR supplier = ANY (ARRAY['cj','dropi','cj_dropshipping','amazon','montink']));
ALTER TABLE public.supplier_fulfillments DROP CONSTRAINT supplier_fulfillments_provider_check;
ALTER TABLE public.supplier_fulfillments ADD CONSTRAINT supplier_fulfillments_provider_check CHECK (provider = ANY (ARRAY['cj','dropi','manual','montink']));