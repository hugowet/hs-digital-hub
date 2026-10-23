CREATE OR REPLACE FUNCTION public.create_marketplace_order_v3(_items jsonb, _shipping_address jsonb, _shipping_quote_ids jsonb, _coupon_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  v_order_id uuid;
  coupon_row public.user_coupons%ROWTYPE;
  shipping_total numeric(12,2) := 0;
  items_subtotal numeric(12,2) := 0;
  requested_discount numeric(12,2) := 0;
  applied_discount numeric(12,2) := 0;
  remaining_discount numeric(12,2) := 0;
  tx_row record;
  tx_discount numeric(12,2);
  fee_discount numeric(12,2);
  seller_discount numeric(12,2);
  is_first_purchase boolean := false;
  first_purchase_margin constant numeric(12,2) := 10.00;
  free_shipping_threshold constant numeric(12,2) := 89.90;
  v_margin numeric(12,2) := 0;
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

  SELECT COALESCE(sum(unit_price * quantity), 0)
  INTO items_subtotal
  FROM public.order_items
  WHERE order_id = v_order_id;

  -- Frete gratis EMBUTIDO somente quando o subtotal dos produtos >= R$ 89,90:
  -- o frete nao e descontado, permanece no total (custo do produto + envio do
  -- fornecedor) e o cliente ve "Frete gratis". Na primeira compra, a plataforma
  -- ainda adiciona R$ 10,00 de margem extra.
  -- Abaixo de R$ 89,90 o frete e cobrado normalmente (cupons de frete seguem valendo).
  IF shipping_total > 0 AND items_subtotal >= free_shipping_threshold THEN
    v_margin := CASE WHEN is_first_purchase THEN first_purchase_margin ELSE 0 END;

    UPDATE public.orders
    SET total = total + v_margin,
        platform_fee = platform_fee + v_margin,
        shipping_address = shipping_address || jsonb_build_object(
          'coupon_code', CASE WHEN is_first_purchase THEN 'PRIMEIRACOMPRA' ELSE 'FRETEGRATIS' END,
          'coupon_discount', 0,
          'first_purchase_free_shipping', is_first_purchase,
          'embedded_free_shipping', true,
          'first_purchase_margin', v_margin
        )
    WHERE id = v_order_id;

    IF v_margin > 0 THEN
      UPDATE public.payment_transactions
      SET gross_amount = gross_amount + v_margin,
          platform_fee = platform_fee + v_margin
      WHERE id = (
        SELECT id FROM public.payment_transactions
        WHERE order_id = v_order_id
        ORDER BY gross_amount DESC, id
        LIMIT 1
      );
    END IF;

    RETURN v_order_id;
  END IF;

  IF _coupon_id IS NULL THEN
    RETURN v_order_id;
  END IF;

  SELECT * INTO coupon_row
  FROM public.user_coupons
  WHERE id = _coupon_id
    AND user_id = current_user_id
    AND status = 'active'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este cupom nao esta disponivel ou expirou.';
  END IF;
  IF shipping_total <= 0 THEN
    RAISE EXCEPTION 'Este cupom e valido somente para pedidos com frete.';
  END IF;

  requested_discount := CASE
    WHEN coupon_row.kind = 'free_shipping' THEN LEAST(shipping_total, coupon_row.max_discount)
    ELSE LEAST(round(shipping_total * coupon_row.percent_off / 100, 2), coupon_row.max_discount)
  END;

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
      RAISE EXCEPTION 'Nao foi possivel aplicar o frete gratis integral a este pedido.';
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
    RAISE EXCEPTION 'O desconto de frete nao pode ser aplicado a este pedido.';
  END IF;

  UPDATE public.orders
  SET total = total - applied_discount,
      platform_fee = platform_fee - LEAST(platform_fee, applied_discount),
      seller_amount = seller_amount - GREATEST(applied_discount - LEAST(platform_fee, applied_discount), 0),
      coupon_discount = applied_discount,
      shipping_address = shipping_address || jsonb_build_object(
        'coupon_code', coupon_row.code,
        'coupon_discount', applied_discount,
        'first_purchase_free_shipping', false
      )
  WHERE id = v_order_id;

  UPDATE public.user_coupons
  SET status = 'redeemed', redeemed_order_id = v_order_id
  WHERE id = coupon_row.id;

  RETURN v_order_id;
END;
$function$;