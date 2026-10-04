ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_cost_currency text,
  ADD COLUMN IF NOT EXISTS supplier_exchange_rate numeric(12,6),
  ADD COLUMN IF NOT EXISTS supplier_exchange_rate_at timestamptz;

ALTER TABLE public.products
  ADD CONSTRAINT products_supplier_cost_currency_check
  CHECK (supplier_cost_currency IS NULL OR supplier_cost_currency IN ('USD', 'BRL')),
  ADD CONSTRAINT products_supplier_exchange_rate_check
  CHECK (supplier_exchange_rate IS NULL OR supplier_exchange_rate > 0);

COMMENT ON COLUMN public.products.supplier_cost IS 'Original supplier cost in supplier_cost_currency; CJ catalog costs are USD.';
COMMENT ON COLUMN public.products.supplier_exchange_rate IS 'BRL units per supplier currency unit used to calculate the storefront price.';