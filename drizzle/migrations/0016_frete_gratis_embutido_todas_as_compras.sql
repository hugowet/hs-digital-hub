CREATE OR REPLACE FUNCTION public.create_marketplace_order_v3(_items jsonb, _shipping_address jsonb, _shipping_quote_ids jsonb, _coupon_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  v_order_id uuid;
  shipping_total numeric(12,2) := 0;
  is_first_purchase boolean := false;
  first_purchase_margin constant numeric(12,2) := 10.00;
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

  -- Estrategia "frete gratis" para TODAS as compras: o frete nunca e descontado nem
  -- exibido como custo separado. Ele permanece embutido no total do pedido
  -- (custo do produto + custo de envio do fornecedor) e o cliente ve "Frete gratis".
  -- Na primeira compra, a plataforma ainda adiciona R$ 10,00 de margem extra.
  IF shipping_total > 0 THEN
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
  END IF;

  RETURN v_order_id;
END;
$function$;