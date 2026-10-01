UPDATE public.products
SET is_active = true
WHERE supplier = 'cj'
  AND is_active = false;