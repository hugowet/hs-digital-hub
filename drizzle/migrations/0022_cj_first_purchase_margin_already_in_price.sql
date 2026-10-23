DO $repair$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.create_marketplace_order_v3(jsonb,jsonb,jsonb,uuid)'::regprocedure) INTO definition;
 IF position('included_margin numeric' IN definition) = 0 THEN
  IF position('v_margin numeric(12,2) := 0;' IN definition) = 0 OR position('v_margin := CASE WHEN is_first_purchase THEN first_purchase_margin ELSE 0 END;' IN definition) = 0 THEN
   RAISE EXCEPTION 'Unexpected checkout function; no change applied';
  END IF;
  definition := replace(definition, 'v_margin numeric(12,2) := 0;', 'v_margin numeric(12,2) := 0;
  included_margin numeric(12,2) := 0;
  margin_fee_adjustment numeric(12,2) := 0;
  commission_rate_value numeric := 0;');
  definition := replace(definition, 'v_order_id := public.create_marketplace_order_v2(_items, _shipping_address, _shipping_quote_ids);', 'SELECT COALESCE(sum((sq.provider_payload->>''first_purchase_margin_included'')::numeric),0) INTO included_margin
    FROM public.shipping_quotes sq WHERE sq.id IN (SELECT value::uuid FROM jsonb_each_text(_shipping_quote_ids)) AND sq.buyer_id=current_user_id;
  IF included_margin > 0 AND (NOT is_first_purchase OR included_margin > 10.01) THEN
    RAISE EXCEPTION ''Seu histórico de compras mudou. Atualize o preço e envio antes de continuar.'';
  END IF;
  v_order_id := public.create_marketplace_order_v2(_items, _shipping_address, _shipping_quote_ids);
  IF included_margin > 0 THEN
    SELECT commission_rate INTO commission_rate_value FROM public.platform_settings WHERE id=true;
    commission_rate_value := COALESCE(commission_rate_value,0.12);
    FOR tx_row IN SELECT pt.id, (sq.provider_payload->>''first_purchase_margin_included'')::numeric AS margin
      FROM public.payment_transactions pt JOIN public.order_shipments os ON os.order_id=pt.order_id AND os.store_id=pt.store_id
      JOIN public.shipping_quotes sq ON sq.id=os.quote_id WHERE pt.order_id=v_order_id
      AND (sq.provider_payload->>''first_purchase_margin_included'')::numeric > 0
    LOOP
      fee_discount := round(tx_row.margin * (1-commission_rate_value),2);
      UPDATE public.payment_transactions SET platform_fee=platform_fee+fee_discount,seller_amount=seller_amount-fee_discount WHERE id=tx_row.id;
      margin_fee_adjustment := margin_fee_adjustment+fee_discount;
    END LOOP;
    UPDATE public.orders SET platform_fee=platform_fee+margin_fee_adjustment,seller_amount=seller_amount-margin_fee_adjustment WHERE id=v_order_id;
  END IF;');
  definition := replace(definition, 'v_margin := CASE WHEN is_first_purchase THEN first_purchase_margin ELSE 0 END;', 'v_margin := CASE WHEN is_first_purchase AND included_margin=0 THEN first_purchase_margin ELSE 0 END;');
  definition := replace(definition, '''first_purchase_margin'', v_margin', '''first_purchase_margin'', v_margin + included_margin');
  EXECUTE definition;
 END IF;
END;
$repair$;
REVOKE ALL ON FUNCTION public.create_marketplace_order_v3(jsonb,jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order_v3(jsonb,jsonb,jsonb,uuid) TO authenticated,service_role;