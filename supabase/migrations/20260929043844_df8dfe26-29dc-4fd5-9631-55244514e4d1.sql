REVOKE EXECUTE ON FUNCTION public.cancel_unpaid_marketplace_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unpaid_marketplace_order(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_unpaid_marketplace_order_for_buyer(_order_id uuid, _buyer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_order public.orders%ROWTYPE;
BEGIN
  IF _buyer_id IS NULL THEN
    RAISE EXCEPTION 'Comprador inválido.';
  END IF;

  SELECT * INTO target_order
  FROM public.orders
  WHERE id = _order_id AND buyer_id = _buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  IF target_order.payment_status <> 'pending' OR target_order.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Somente pedidos aguardando pagamento podem ser cancelados.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payment_transactions
    WHERE order_id = _order_id AND provider_payment_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'O pagamento já foi iniciado. Aguarde a expiração do Pix ou a atualização do cartão.';
  END IF;

  UPDATE public.products p
  SET stock = p.stock + reserved.quantity
  FROM (
    SELECT product_id, sum(quantity)::integer AS quantity
    FROM public.order_items
    WHERE order_id = _order_id AND product_id IS NOT NULL
    GROUP BY product_id
  ) reserved
  WHERE p.id = reserved.product_id;

  UPDATE public.payment_transactions
  SET status = 'cancelled',
      inventory_released = true,
      failure_reason = 'cancelled_by_buyer'
  WHERE order_id = _order_id
    AND status IN ('pending', 'in_process')
    AND NOT inventory_released;

  UPDATE public.orders
  SET status = 'cancelled', payment_status = 'failed'
  WHERE id = _order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_unpaid_marketplace_order_for_buyer(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unpaid_marketplace_order_for_buyer(uuid, uuid) TO service_role;