CREATE OR REPLACE FUNCTION public.cj_quoted_unit_price(_quote_id uuid, _product_id uuid, _quantity integer, _zip text) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.shipping_quotes%ROWTYPE; priced jsonb; v_price numeric;
BEGIN
 SELECT * INTO q FROM public.shipping_quotes WHERE id=_quote_id AND buyer_id=auth.uid() AND destination_postal_code=_zip AND expires_at>now() AND consumed_order_id IS NULL;
 IF NOT FOUND OR q.provider <> 'cj' OR q.provider_payload->>'pricing_version' <> '1' THEN RAISE EXCEPTION 'Recalcule o preço e o envio CJ antes de comprar.'; END IF;
 SELECT value INTO priced FROM jsonb_array_elements(q.provider_payload->'priced_items') WHERE value->>'product_id'=_product_id::text AND (value->>'quantity')::integer=_quantity;
 v_price := (priced->>'unit_price')::numeric;
 IF v_price IS NULL OR v_price<=0 THEN RAISE EXCEPTION 'Preço CJ não confirmado.'; END IF;
 RETURN v_price;
END; $$;
REVOKE ALL ON FUNCTION public.cj_quoted_unit_price(uuid,uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cj_quoted_unit_price(uuid,uuid,integer,text) TO authenticated,service_role;
DO $repair$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.create_marketplace_order_v2(jsonb,jsonb,jsonb)'::regprocedure) INTO definition;
 definition := replace(definition,'s.status, s.mercado_pago_status','s.status, s.mercado_pago_status, p.supplier');
 definition := replace(definition,'item_total := round(product_row.price * quantity_value, 2);', 'IF product_row.supplier = ''cj'' THEN
 product_row.price := public.cj_quoted_unit_price((_shipping_quote_ids ->> product_row.store_id::text)::uuid, product_id_value, quantity_value, destination_zip);
 END IF;
 item_total := round(product_row.price * quantity_value, 2);');
 definition := replace(definition,'SELECT p.id, p.store_id, p.title, p.price INTO product_row','SELECT p.id, p.store_id, p.title, p.price, p.supplier INTO product_row');
 definition := replace(definition,'item_fee := round(item_total * rate, 2);', 'IF product_row.supplier = ''cj'' THEN
 SELECT * INTO quote_row FROM public.shipping_quotes WHERE id=(_shipping_quote_ids ->> product_row.store_id::text)::uuid;
 item_fee := round(GREATEST(0, item_total - COALESCE((SELECT (value->>''embedded_freight'')::numeric * quantity_value FROM jsonb_array_elements(quote_row.provider_payload->''priced_items'') WHERE value->>''product_id''=product_id_value::text),0)) * rate,2);
 ELSE
 item_fee := round(item_total * rate, 2);
 END IF;');
 EXECUTE definition;
 SELECT pg_get_functiondef('public.create_marketplace_order_v3(jsonb,jsonb,jsonb,uuid)'::regprocedure) INTO definition;
 definition := replace(definition,'IF shipping_total > 0 AND items_subtotal >= free_shipping_threshold THEN','IF (shipping_total > 0 AND items_subtotal >= free_shipping_threshold) OR EXISTS (SELECT 1 FROM public.order_shipments os JOIN public.shipping_quotes sq ON sq.id=os.quote_id WHERE os.order_id=v_order_id AND sq.provider=''cj'' AND sq.provider_payload->>''embedded_free_shipping''=''true'') THEN');
 EXECUTE definition;
END; $repair$;
COMMENT ON FUNCTION public.reprice_cj_products_brl(uuid,numeric,numeric) IS 'DEPRECATED: item-only base prices are maintained by shared Amazon pricing; customer-CEP landed prices are stored in validated CJ quotes.';