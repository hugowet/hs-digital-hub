CREATE TABLE public.seller_shipping_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'melhor_envio'),
  status text NOT NULL DEFAULT 'pending_credentials' CHECK (status IN ('pending_credentials', 'active', 'error', 'paused')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  oauth_state_hash text,
  oauth_state_expires_at timestamptz,
  redirect_origin text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, provider)
);
GRANT SELECT ON public.seller_shipping_integrations TO authenticated;
GRANT ALL ON public.seller_shipping_integrations TO service_role;
ALTER TABLE public.seller_shipping_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store owners read shipping integrations"
ON public.seller_shipping_integrations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = seller_shipping_integrations.store_id AND s.owner_id = auth.uid()
));
CREATE TRIGGER seller_shipping_integrations_set_updated_at
BEFORE UPDATE ON public.seller_shipping_integrations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.supplier_fulfillments
  ADD COLUMN IF NOT EXISTS shipping_service_code text,
  ADD COLUMN IF NOT EXISTS shipping_service_name text,
  ADD COLUMN IF NOT EXISTS shipping_amount numeric(12,2);

ALTER TABLE public.supplier_fulfillments
  ADD CONSTRAINT supplier_fulfillments_shipping_amount_check CHECK (shipping_amount IS NULL OR shipping_amount >= 0);