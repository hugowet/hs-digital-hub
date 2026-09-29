CREATE TABLE public.dismissed_order_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id)
);

GRANT SELECT, INSERT, DELETE ON public.dismissed_order_notifications TO authenticated;
GRANT ALL ON public.dismissed_order_notifications TO service_role;

ALTER TABLE public.dismissed_order_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own dismissed notifications"
ON public.dismissed_order_notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Buyers can dismiss own order notifications"
ON public.dismissed_order_notifications
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.buyer_id = auth.uid()
  )
);

CREATE POLICY "Buyers can restore own order notifications"
ON public.dismissed_order_notifications
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.cancel_unpaid_marketplace_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  target_order public.orders%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para cancelar o pedido.';
  END IF;

  SELECT * INTO target_order
  FROM public.orders
  WHERE id = _order_id AND buyer_id = current_user_id
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

REVOKE ALL ON FUNCTION public.cancel_unpaid_marketplace_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_unpaid_marketplace_order(uuid) TO authenticated;