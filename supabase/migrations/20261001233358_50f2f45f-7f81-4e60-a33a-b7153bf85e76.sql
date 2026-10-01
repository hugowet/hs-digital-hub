CREATE TABLE public.supplier_catalog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('cj')),
  category_id text NOT NULL,
  category_name text NOT NULL,
  category_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  product_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(product_ids) = 'array'),
  next_product_index integer NOT NULL DEFAULT 0 CHECK (next_product_index >= 0),
  imported_count integer NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  last_error text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, provider, category_id)
);
GRANT SELECT ON public.supplier_catalog_categories TO authenticated;
GRANT ALL ON public.supplier_catalog_categories TO service_role;
ALTER TABLE public.supplier_catalog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store owners read supplier catalog categories"
ON public.supplier_catalog_categories FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = supplier_catalog_categories.store_id AND s.owner_id = auth.uid()
));
CREATE INDEX supplier_catalog_categories_queue_idx
ON public.supplier_catalog_categories(store_id, provider, status, updated_at);
CREATE TRIGGER supplier_catalog_categories_set_updated_at
BEFORE UPDATE ON public.supplier_catalog_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.supplier_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('cj')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  total_categories integer NOT NULL DEFAULT 0 CHECK (total_categories >= 0),
  completed_categories integer NOT NULL DEFAULT 0 CHECK (completed_categories >= 0),
  imported_products integer NOT NULL DEFAULT 0 CHECK (imported_products >= 0),
  skipped_products integer NOT NULL DEFAULT 0 CHECK (skipped_products >= 0),
  lock_expires_at timestamptz,
  pause_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, provider)
);
GRANT SELECT ON public.supplier_import_jobs TO authenticated;
GRANT ALL ON public.supplier_import_jobs TO service_role;
ALTER TABLE public.supplier_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store owners read supplier import jobs"
ON public.supplier_import_jobs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = supplier_import_jobs.store_id AND s.owner_id = auth.uid()
));
CREATE TRIGGER supplier_import_jobs_set_updated_at
BEFORE UPDATE ON public.supplier_import_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();