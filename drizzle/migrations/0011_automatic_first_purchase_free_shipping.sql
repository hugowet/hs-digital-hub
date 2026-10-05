CREATE OR REPLACE FUNCTION public.create_marketplace_order_v3(_items jsonb, _shipping_address jsonb, _shipping_quote_ids jsonb, _coupon_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  v_order_id uuid;
  coupon_row public.user_coupons%ROWTYPE;
  shipping_total numeric(12,2) := 0;
  requested_discount numeric(12,2) := 0;
  applied_discount numeric(12,2) := 0;
  remaining_discount numeric(12,2) := 0;
  tx_row record;
  tx_discount numeric(12,2);
  fee_discount numeric(12,2);
  seller_discount numeric(12,2);
  is_first_purchase boolean := false;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para finalizar o pedido.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 847221));

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE buyer_id = current_user_id
      AND status NOT IN ('cancelled', 'payment_failed')
  ) INTO is_first_purchase;

  v_order_id := public.create_marketplace_order_v2(_items, _shipping_address, _shipping_quote_ids);

  SELECT COALESCE(sum(amount), 0)
  INTO shipping_total
  FROM public.order_shipments
  WHERE order_id = v_order_id;

  IF is_first_purchase AND shipping_total > 0 THEN
    requested_discount := shipping_total;
  ELSIF _coupon_id IS NOT NULL THEN
    SELECT * INTO coupon_row
    FROM public.user_coupons
    WHERE id = _coupon_id
      AND user_id = current_user_id
      AND status = 'active'
      AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Este cupom não está disponível ou expirou.';
    END IF;
    IF shipping_total <= 0 THEN
      RAISE EXCEPTION 'Este cupom é válido somente para pedidos com frete.';
    END IF;

    requested_discount := CASE
      WHEN coupon_row.kind = 'free_shipping' THEN LEAST(shipping_total, coupon_row.max_discount)
      ELSE LEAST(round(shipping_total * coupon_row.percent_off / 100, 2), coupon_row.max_discount)
    END;
  ELSE
    RETURN v_order_id;
  END IF;

  remaining_discount := requested_discount;

  FOR tx_row IN
    SELECT pt.id, pt.platform_fee, pt.seller_amount, os.amount AS shipping_amount
    FROM public.payment_transactions pt
    JOIN public.order_shipments os
      ON os.order_id = pt.order_id AND os.store_id = pt.store_id
    WHERE pt.order_id = v_order_id
    ORDER BY os.amount DESC, pt.id
    FOR UPDATE OF pt
  LOOP
    EXIT WHEN remaining_discount <= 0;
    tx_discount := LEAST(remaining_discount, tx_row.shipping_amount);
    fee_discount := LEAST(tx_row.platform_fee, tx_discount);
    seller_discount := tx_discount - fee_discount;

    IF seller_discount > tx_row.seller_amount THEN
      RAISE EXCEPTION 'Não foi possível aplicar o frete grátis integral a este pedido.';
    END IF;

    UPDATE public.payment_transactions
    SET gross_amount = gross_amount - tx_discount,
        platform_fee = platform_fee - fee_discount,
        seller_amount = seller_amount - seller_discount
    WHERE id = tx_row.id;

    applied_discount := applied_discount + tx_discount;
    remaining_discount := remaining_discount - tx_discount;
  END LOOP;

  IF applied_discount <= 0 THEN
    RAISE EXCEPTION 'O desconto de frete não pôde ser aplicado a este pedido.';
  END IF;

  UPDATE public.orders
  SET total = total - applied_discount,
      platform_fee = platform_fee - LEAST(platform_fee, applied_discount),
      seller_amount = seller_amount - GREATEST(applied_discount - LEAST(platform_fee, applied_discount), 0),
      coupon_discount = applied_discount,
      shipping_address = shipping_address || jsonb_build_object(
        'coupon_code', CASE WHEN is_first_purchase THEN 'PRIMEIRACOMPRA' ELSE coupon_row.code END,
        'coupon_discount', applied_discount,
        'first_purchase_free_shipping', is_first_purchase
      )
  WHERE id = v_order_id;

  IF NOT is_first_purchase AND coupon_row.id IS NOT NULL THEN
    UPDATE public.user_coupons
    SET status = 'redeemed', redeemed_order_id = v_order_id
    WHERE id = coupon_row.id;
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_marketplace_order_v3(jsonb, jsonb, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order_v3(jsonb, jsonb, jsonb, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.create_marketplace_order_v3(jsonb, jsonb, jsonb, uuid) IS 'Creates a marketplace order and atomically waives all quoted shipping on the buyer first non-cancelled purchase; later orders may use shipping coupons.';