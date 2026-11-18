CREATE OR REPLACE FUNCTION public.create_marketplace_order_v4(_items jsonb,_shipping_address jsonb,_shipping_quote_ids jsonb,_coupon_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE oid uuid; ident jsonb; subtotal numeric; freight numeric; charged numeric; included numeric; adj numeric; t record; share numeric; remaining numeric; cnt integer;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
IF EXISTS(SELECT 1 FROM jsonb_array_elements(_items) i JOIN public.products p ON p.id=(i->>'product_id')::uuid WHERE NOT EXISTS(SELECT 1 FROM public.hs_shipping_stores s WHERE s.store_id=p.store_id)) THEN RETURN public.create_marketplace_order_v3(_items,_shipping_address,_shipping_quote_ids,_coupon_id); END IF;
PERFORM set_config('lock_timeout','5s',true);
PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,847221));
ident:=public.hs_shipping_identity();
SELECT COALESCE(sum((q.provider_payload->>'first_purchase_margin_included')::numeric),0) INTO included FROM public.shipping_quotes q WHERE q.buyer_id=auth.uid() AND q.id IN(SELECT value::uuid FROM jsonb_each_text(_shipping_quote_ids));
IF included>0 AND (included>10.01 OR EXISTS(SELECT 1 FROM public.orders WHERE buyer_id=auth.uid() AND status NOT IN('cancelled','payment_failed'))) THEN RAISE EXCEPTION 'Atualize o preço e envio para seu histórico atual.'; END IF;
oid:=public.create_marketplace_order_v2(_items,_shipping_address,_shipping_quote_ids);
SELECT sum(unit_price*quantity) INTO subtotal FROM public.order_items WHERE order_id=oid;
SELECT count(*) INTO cnt FROM public.order_shipments WHERE order_id=oid;
charged:=CASE WHEN cnt=0 THEN 0 ELSE public.hs_shipping_tier(subtotal,COALESCE((ident->>'admin')::boolean,false) OR COALESCE((ident->>'club')::boolean,false)) END;
remaining:=charged;
-- Explicit fields prevent the payment payload from shadowing the shipping quote payload.
FOR t IN SELECT pt.id,pt.store_id,COALESCE(os.amount,0) AS freight,os.id AS shipment_id,sq.provider_payload AS quote_payload FROM public.payment_transactions pt LEFT JOIN public.order_shipments os ON os.order_id=pt.order_id AND os.store_id=pt.store_id LEFT JOIN public.shipping_quotes sq ON sq.id=os.quote_id WHERE pt.order_id=oid ORDER BY pt.id FOR UPDATE OF pt LOOP
IF t.shipment_id IS NULL THEN share:=0; ELSE share:=remaining; remaining:=0; END IF;
INSERT INTO public.hs_shipping_expenses(order_id,store_id,buyer_id,supplier_amount,buyer_amount,hs_expense) VALUES(oid,t.store_id,auth.uid(),t.freight,share,greatest(t.freight-share,0));
adj:=round(COALESCE((t.quote_payload->>'first_purchase_margin_included')::numeric,0)*(1-COALESCE((SELECT commission_rate FROM public.platform_settings WHERE id=true),0.12)),2);
UPDATE public.payment_transactions SET gross_amount=gross_amount-t.freight+share,platform_fee=platform_fee+adj,seller_amount=seller_amount-t.freight+share-adj WHERE id=t.id;
END LOOP;
UPDATE public.orders SET total=subtotal+charged,platform_fee=(SELECT sum(platform_fee) FROM public.payment_transactions WHERE order_id=oid),seller_amount=(SELECT sum(seller_amount) FROM public.payment_transactions WHERE order_id=oid),shipping_address=COALESCE(shipping_address,'{}'::jsonb)||jsonb_build_object('shipping_total',charged,'tiered_shipping',true,'embedded_free_shipping',false,'hs_shipping_expense',(SELECT sum(hs_expense) FROM public.hs_shipping_expenses WHERE order_id=oid)) WHERE id=oid;
RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.create_marketplace_order_v4(jsonb,jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order_v4(jsonb,jsonb,jsonb,uuid) TO authenticated;