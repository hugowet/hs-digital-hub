ALTER TABLE public.products
  ADD COLUMN product_type text NOT NULL DEFAULT 'physical';

ALTER TABLE public.products
  ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('physical', 'digital'));

UPDATE public.products
SET product_type = 'digital'
WHERE category IN ('digitais-templates', 'cursos-infoprodutos');

CREATE TABLE public.digital_product_assets (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  delivery_url text NOT NULL CHECK (char_length(delivery_url) BETWEEN 8 AND 2000),
  delivery_instructions text CHECK (char_length(delivery_instructions) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_product_assets TO authenticated;
GRANT ALL ON public.digital_product_assets TO service_role;
ALTER TABLE public.digital_product_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller reads own digital assets"
ON public.digital_product_assets FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = digital_product_assets.store_id AND s.owner_id = auth.uid()
));
CREATE POLICY "seller creates own digital assets"
ON public.digital_product_assets FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = digital_product_assets.store_id AND s.owner_id = auth.uid()
));
CREATE POLICY "seller updates own digital assets"
ON public.digital_product_assets FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = digital_product_assets.store_id AND s.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = digital_product_assets.store_id AND s.owner_id = auth.uid()
));
CREATE POLICY "seller deletes own digital assets"
ON public.digital_product_assets FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = digital_product_assets.store_id AND s.owner_id = auth.uid()
));

CREATE TRIGGER digital_product_assets_set_updated_at
BEFORE UPDATE ON public.digital_product_assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.digital_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  buyer_id uuid NOT NULL,
  title text NOT NULL,
  delivery_url text NOT NULL,
  delivery_instructions text,
  released_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id)
);
GRANT SELECT ON public.digital_deliveries TO authenticated;
GRANT ALL ON public.digital_deliveries TO service_role;
ALTER TABLE public.digital_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer reads own digital deliveries"
ON public.digital_deliveries FOR SELECT TO authenticated
USING (buyer_id = auth.uid());
CREATE POLICY "seller reads own digital deliveries"
ON public.digital_deliveries FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = digital_deliveries.store_id AND s.owner_id = auth.uid()
));
CREATE POLICY "admin reads all digital deliveries"
ON public.digital_deliveries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.payment_transactions
  ADD COLUMN pix_qr_code text,
  ADD COLUMN pix_qr_code_base64 text,
  ADD COLUMN payment_expires_at timestamptz;

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
  IF previous_status = 'approved' AND _status <> 'approved' THEN
    RETURN;
  END IF;

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

    UPDATE public.products p
    SET sold_count = sold_count + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = tx.order_id
      AND oi.store_id = tx.store_id
      AND oi.product_id = p.id;

    INSERT INTO public.digital_deliveries (
      order_id, order_item_id, product_id, store_id, buyer_id,
      title, delivery_url, delivery_instructions
    )
    SELECT oi.order_id, oi.id, oi.product_id, oi.store_id, tx.buyer_id,
           oi.title, da.delivery_url, da.delivery_instructions
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id AND p.product_type = 'digital'
    JOIN public.digital_product_assets da ON da.product_id = oi.product_id
    WHERE oi.order_id = tx.order_id AND oi.store_id = tx.store_id
    ON CONFLICT (order_item_id) DO NOTHING;
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

  SELECT COALESCE(bool_and(status = 'approved'), false),
         COALESCE(bool_or(status IN ('cancelled', 'rejected', 'refunded', 'charged_back', 'expired')), false)
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