ALTER TABLE public.products
  ADD COLUMN supplier_title_original text,
  ADD COLUMN supplier_locale text;

ALTER TABLE public.products
  ADD CONSTRAINT products_supplier_locale_check
  CHECK (supplier_locale IS NULL OR supplier_locale IN ('en', 'pt-BR'));

UPDATE public.products
SET supplier_title_original = title,
    supplier_locale = 'en'
WHERE supplier = 'cj'
  AND supplier_title_original IS NULL;

COMMENT ON COLUMN public.products.supplier_title_original IS 'Original supplier title retained for stable translation and audit.';
COMMENT ON COLUMN public.products.supplier_locale IS 'Locale of the customer-facing supplier product text.';