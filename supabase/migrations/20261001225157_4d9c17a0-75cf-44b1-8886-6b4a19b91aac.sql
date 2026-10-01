ALTER TABLE public.products
  ADD COLUMN supplier text,
  ADD COLUMN supplier_product_id text,
  ADD COLUMN supplier_variant_id text,
  ADD COLUMN supplier_sku text,
  ADD COLUMN supplier_cost numeric(12,2),
  ADD COLUMN supplier_last_synced_at timestamptz;

ALTER TABLE public.products
  ADD CONSTRAINT products_supplier_check CHECK (supplier IS NULL OR supplier IN ('cj', 'dropi')),
  ADD CONSTRAINT products_supplier_cost_check CHECK (supplier_cost IS NULL OR supplier_cost >= 0);

CREATE UNIQUE INDEX products_supplier_identity_idx
ON public.products(store_id, supplier, supplier_variant_id)
WHERE supplier IS NOT NULL AND supplier_variant_id IS NOT NULL;

CREATE TABLE public.supplier_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('cj', 'dropi')),
  status text NOT NULL DEFAULT 'pending_credentials' CHECK (status IN ('pending_credentials', 'active', 'paused', 'error')),
  margin_percent numeric(7,2) NOT NULL DEFAULT 35 CHECK (margin_percent >= 0 AND margin_percent <= 1000),
  auto_sync boolean NOT NULL DEFAULT true,
  auto_fulfill boolean NOT NULL DEFAULT true,
  last_catalog_sync_at timestamptz,
  last_stock_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, provider)
);
GRANT SELECT ON public.supplier_integrations TO authenticated;
GRANT ALL ON public.supplier_integrations TO service_role;
ALTER TABLE public.supplier_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store owners read supplier integrations"
ON public.supplier_integrations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = supplier_integrations.store_id AND s.owner_id = auth.uid()
));
CREATE TRIGGER supplier_integrations_set_updated_at
BEFORE UPDATE ON public.supplier_integrations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.supplier_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('cj', 'dropi')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'submitted', 'shipped', 'delivered', 'retry', 'failed', 'cancelled')),
  external_order_id text,
  tracking_code text,
  tracking_carrier text,
  request_payload jsonb,
  provider_payload jsonb,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  submitted_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, store_id, provider)
);
GRANT SELECT ON public.supplier_fulfillments TO authenticated;
GRANT ALL ON public.supplier_fulfillments TO service_role;
ALTER TABLE public.supplier_fulfillments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyers read own supplier fulfillment"
ON public.supplier_fulfillments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = supplier_fulfillments.order_id AND o.buyer_id = auth.uid()));
CREATE POLICY "store owners read own supplier fulfillment"
ON public.supplier_fulfillments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = supplier_fulfillments.store_id AND s.owner_id = auth.uid()
));
CREATE INDEX supplier_fulfillments_queue_idx ON public.supplier_fulfillments(status, next_attempt_at);
CREATE TRIGGER supplier_fulfillments_set_updated_at
BEFORE UPDATE ON public.supplier_fulfillments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.queue_supplier_fulfillment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.supplier_fulfillments (order_id, store_id, provider)
    SELECT DISTINCT NEW.order_id, NEW.store_id, p.supplier
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.supplier_integrations si
      ON si.store_id = NEW.store_id AND si.provider = p.supplier
    WHERE oi.order_id = NEW.order_id
      AND oi.store_id = NEW.store_id
      AND p.supplier IS NOT NULL
      AND p.supplier_variant_id IS NOT NULL
      AND si.status = 'active'
      AND si.auto_fulfill
    ON CONFLICT (order_id, store_id, provider) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_supplier_fulfillment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_supplier_fulfillment() TO service_role;
CREATE TRIGGER payment_transactions_queue_supplier
AFTER UPDATE OF status ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.queue_supplier_fulfillment();

INSERT INTO public.supplier_integrations (store_id, provider, status, margin_percent, auto_sync, auto_fulfill)
VALUES
  ('8bc94f28-2c61-4de2-97d3-596d80ebae06', 'cj', 'active', 35, true, true),
  ('8bc94f28-2c61-4de2-97d3-596d80ebae06', 'dropi', 'pending_credentials', 35, true, true)
ON CONFLICT (store_id, provider) DO UPDATE
SET margin_percent = EXCLUDED.margin_percent,
    auto_sync = EXCLUDED.auto_sync,
    auto_fulfill = EXCLUDED.auto_fulfill,
    status = CASE WHEN supplier_integrations.provider = 'cj' THEN 'active' ELSE supplier_integrations.status END;

DELETE FROM public.products
WHERE store_id IN (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid
)
OR id::text LIKE 'a000000%';