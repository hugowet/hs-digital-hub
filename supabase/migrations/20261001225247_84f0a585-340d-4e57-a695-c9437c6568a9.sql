ALTER TABLE public.supplier_integrations
  ADD COLUMN access_token_encrypted text,
  ADD COLUMN refresh_token_encrypted text,
  ADD COLUMN token_expires_at timestamptz;

REVOKE SELECT ON public.supplier_integrations FROM authenticated;
GRANT SELECT (id, store_id, provider, status, margin_percent, auto_sync, auto_fulfill, last_catalog_sync_at, last_stock_sync_at, last_error, created_at, updated_at)
ON public.supplier_integrations TO authenticated;