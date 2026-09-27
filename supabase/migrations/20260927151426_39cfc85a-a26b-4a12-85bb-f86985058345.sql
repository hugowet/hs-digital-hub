ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description_long text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variations jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_email text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'abandonado',
  source text NOT NULL DEFAULT 'carrinho',
  webhook_reference text,
  reminder_processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abandoned_carts_quantity_valid CHECK (quantity BETWEEN 1 AND 99),
  CONSTRAINT abandoned_carts_status_valid CHECK (status IN ('abandonado', 'recuperado', 'convertido')),
  CONSTRAINT abandoned_carts_source_valid CHECK (source IN ('carrinho', 'checkout')),
  CONSTRAINT abandoned_carts_user_product_unique UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.abandoned_carts TO authenticated;
GRANT ALL ON public.abandoned_carts TO service_role;

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own abandoned carts"
ON public.abandoned_carts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users create own abandoned carts"
ON public.abandoned_carts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update own abandoned carts"
ON public.abandoned_carts FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own abandoned carts"
ON public.abandoned_carts FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "service manages abandoned carts"
ON public.abandoned_carts FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER abandoned_carts_set_updated_at
BEFORE UPDATE ON public.abandoned_carts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX abandoned_carts_status_updated_idx
ON public.abandoned_carts (status, updated_at);
CREATE INDEX abandoned_carts_user_idx
ON public.abandoned_carts (user_id);
CREATE INDEX abandoned_carts_product_idx
ON public.abandoned_carts (product_id);