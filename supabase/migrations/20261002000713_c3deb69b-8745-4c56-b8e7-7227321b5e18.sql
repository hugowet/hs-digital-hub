ALTER TABLE public.supplier_catalog_categories
ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 0;

UPDATE public.supplier_catalog_categories
SET priority = CASE
  WHEN lower(category_path) ~ '(earphone|headphone|headset|bluetooth|smart[ -]?watch|speaker|portable audio|wearable)' THEN 100
  WHEN lower(category_path) ~ '(consumer electronics|phone accessories|computer accessories|electronic)' THEN 50
  ELSE 0
END
WHERE provider = 'cj'
  AND status = 'pending';

CREATE INDEX IF NOT EXISTS supplier_catalog_categories_priority_queue_idx
ON public.supplier_catalog_categories (store_id, provider, status, priority DESC, created_at ASC);