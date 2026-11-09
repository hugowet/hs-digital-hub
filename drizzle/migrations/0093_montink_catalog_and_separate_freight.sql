CREATE UNIQUE INDEX IF NOT EXISTS products_montink_identity_idx ON public.products(store_id,supplier_product_id) WHERE supplier='montink' AND supplier_product_id IS NOT NULL;
DO $$ DECLARE definition text; BEGIN
SELECT pg_get_functiondef('public.create_marketplace_order_v3(jsonb,jsonb,jsonb,uuid)'::regprocedure) INTO definition;
IF position('IF (shipping_total > 0 AND items_subtotal >= free_shipping_threshold)' in definition)=0 THEN RAISE EXCEPTION 'Checkout condition changed; inspect before updating'; END IF;
definition := replace(definition, 'IF (shipping_total > 0 AND items_subtotal >= free_shipping_threshold)', 'IF (shipping_total > 0 AND items_subtotal >= free_shipping_threshold AND NOT EXISTS (SELECT 1 FROM public.order_shipments ms WHERE ms.order_id=v_order_id AND ms.service_code LIKE ''montink_%''))');
EXECUTE definition;
END $$;