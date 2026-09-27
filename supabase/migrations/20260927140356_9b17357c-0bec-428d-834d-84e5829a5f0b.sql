CREATE TABLE public.mercado_pago_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash text NOT NULL UNIQUE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_origin text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mercado_pago_oauth_states TO service_role;
ALTER TABLE public.mercado_pago_oauth_states ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_transactions
  ADD COLUMN inventory_released boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apply_mercado_pago_status(
  _transaction_id uuid,
  _provider_payment_id text,
  _status text,
  _payment_method text,
  _provider_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.payment_transactions%ROWTYPE;
  previous_status text;
  is_terminal_failure boolean;
  all_approved boolean;
  any_failed boolean;
BEGIN
  SELECT * INTO tx
  FROM public.payment_transactions
  WHERE id = _transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada.';
  END IF;

  IF tx.provider_payment_id IS NOT NULL
     AND tx.provider_payment_id <> _provider_payment_id THEN
    RAISE EXCEPTION 'Pagamento não corresponde à transação.';
  END IF;

  previous_status := tx.status;
  is_terminal_failure := _status IN ('cancelled', 'rejected', 'refunded', 'charged_back', 'expired');

  UPDATE public.payment_transactions
  SET provider_payment_id = _provider_payment_id,
      status = _status,
      payment_method = NULLIF(_payment_method, ''),
      provider_payload = _provider_payload,
      paid_at = CASE WHEN _status = 'approved' THEN COALESCE(paid_at, now()) ELSE paid_at END,
      failure_reason = CASE
        WHEN is_terminal_failure THEN COALESCE(_provider_payload ->> 'status_detail', _status)
        ELSE NULL
      END
  WHERE id = tx.id;

  IF _status = 'approved' AND previous_status <> 'approved' THEN
    UPDATE public.stores
    SET balance = balance + tx.seller_amount
    WHERE id = tx.store_id;
  END IF;

  IF is_terminal_failure AND previous_status <> 'approved' AND NOT tx.inventory_released THEN
    UPDATE public.products p
    SET stock = p.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = tx.order_id
      AND oi.store_id = tx.store_id
      AND oi.product_id = p.id;

    UPDATE public.payment_transactions
    SET inventory_released = true
    WHERE id = tx.id;
  END IF;

  SELECT bool_and(status = 'approved'),
         bool_or(status IN ('cancelled', 'rejected', 'refunded', 'charged_back', 'expired'))
    INTO all_approved, any_failed
  FROM public.payment_transactions
  WHERE order_id = tx.order_id;

  UPDATE public.orders
  SET payment_status = CASE
        WHEN all_approved THEN 'approved'
        WHEN any_failed THEN 'failed'
        ELSE 'pending'
      END,
      status = CASE
        WHEN all_approved THEN 'paid'
        WHEN any_failed THEN 'payment_failed'
        ELSE 'awaiting_payment'
      END,
      payment_reference = CASE WHEN all_approved THEN _provider_payment_id ELSE payment_reference END
  WHERE id = tx.order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_mercado_pago_status(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_mercado_pago_status(uuid, text, text, text, jsonb) TO service_role;

CREATE INDEX mercado_pago_oauth_states_expiry_idx
  ON public.mercado_pago_oauth_states (expires_at)
  WHERE used_at IS NULL;
CREATE INDEX payment_transactions_provider_payment_idx
  ON public.payment_transactions (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;