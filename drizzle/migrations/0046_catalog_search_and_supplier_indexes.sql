CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS products_catalog_search_trgm_idx
  ON public.products USING gin (catalog_search_text extensions.gin_trgm_ops)
  WHERE is_active AND supplier_variant_parent_id IS NULL;

CREATE INDEX IF NOT EXISTS products_variant_parent_idx
  ON public.products (supplier_variant_parent_id)
  WHERE supplier_variant_parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_supplier_parent_stats_idx
  ON public.products (store_id, supplier, is_active, supplier_locale, supplier_content_version)
  WHERE supplier_variant_parent_id IS NULL;

CREATE INDEX IF NOT EXISTS products_supplier_sync_oldest_idx
  ON public.products (store_id, supplier, supplier_last_synced_at NULLS FIRST)
  WHERE supplier_variant_id IS NOT NULL;

ANALYZE public.products;