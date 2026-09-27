CREATE TABLE public.payment_provider_settings (
  provider text PRIMARY KEY,
  public_key text NOT NULL,
  access_token_encrypted text NOT NULL,
  client_id text NOT NULL,
  client_secret_encrypted text NOT NULL,
  webhook_secret_encrypted text NOT NULL,
  environment text NOT NULL DEFAULT 'production' CHECK (environment = 'production'),
  configured_by uuid NOT NULL,
  configured_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_provider_settings TO service_role;
ALTER TABLE public.payment_provider_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service manages payment provider settings"
ON public.payment_provider_settings FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER payment_provider_settings_set_updated_at
BEFORE UPDATE ON public.payment_provider_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "seller reads store orders"
ON public.orders FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.order_items oi
  JOIN public.stores s ON s.id = oi.store_id
  WHERE oi.order_id = orders.id AND s.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "buyer and seller read items" ON public.order_items;
CREATE POLICY "buyer seller and admin read items"
ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = order_items.store_id AND s.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE OR REPLACE FUNCTION public.release_expired_marketplace_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count integer := 0;
  tx record;
BEGIN
  FOR tx IN
    SELECT pt.id
    FROM public.payment_transactions pt
    JOIN public.orders o ON o.id = pt.order_id
    WHERE o.expires_at <= now()
      AND pt.status IN ('pending', 'in_process')
      AND NOT pt.inventory_released
    FOR UPDATE OF pt SKIP LOCKED
  LOOP
    PERFORM public.apply_mercado_pago_status(
      tx.id,
      COALESCE((SELECT provider_payment_id FROM public.payment_transactions WHERE id = tx.id), 'expired-' || tx.id::text),
      'expired',
      '',
      jsonb_build_object('status_detail', 'expired_without_payment')
    );
    released_count := released_count + 1;
  END LOOP;
  RETURN released_count;
END;
$$;
REVOKE ALL ON FUNCTION public.release_expired_marketplace_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_marketplace_orders() TO service_role;