ALTER TABLE public.supplier_fulfillments ADD COLUMN supplier_expected_delivery date;
CREATE OR REPLACE FUNCTION public.save_seller_delivery_estimate(_store_id uuid, _order_id uuid, _date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.stores WHERE id=_store_id AND owner_id=auth.uid()) OR NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id=_order_id AND store_id=_store_id) THEN RAISE EXCEPTION 'Pedido não pertence à loja.'; END IF;
 PERFORM 1 FROM public.orders WHERE id=_order_id AND payment_status IN ('paid','approved') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Aguarde o pagamento aprovado.'; END IF;
 IF _date IS NULL THEN RAISE EXCEPTION 'Informe a previsão do fornecedor.'; END IF;
 INSERT INTO public.supplier_fulfillments(order_id,store_id,provider,status,supplier_expected_delivery)
 VALUES(_order_id,_store_id,'manual','submitted',_date)
 ON CONFLICT(order_id,store_id,provider) DO UPDATE SET supplier_expected_delivery=EXCLUDED.supplier_expected_delivery,updated_at=now();
END $fn$;
REVOKE ALL ON FUNCTION public.save_seller_delivery_estimate(uuid,uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_seller_delivery_estimate(uuid,uuid,date) TO authenticated;
