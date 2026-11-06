CREATE OR REPLACE FUNCTION public.prevent_duplicate_active_product()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id <> NEW.id AND p.is_active
      AND p.store_id = NEW.store_id
      AND lower(trim(p.title)) = lower(trim(NEW.title))
      AND p.price = NEW.price
      AND coalesce(p.image_url,'') = coalesce(NEW.image_url,'')
  ) THEN
    RAISE EXCEPTION 'Produto duplicado: já existe um produto igual com o mesmo preço na loja' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END $$;

CREATE INDEX IF NOT EXISTS products_dup_check_idx ON public.products (store_id, price, lower(trim(title))) WHERE is_active;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_active_product ON public.products;
CREATE TRIGGER trg_prevent_duplicate_active_product
BEFORE INSERT OR UPDATE OF title, price, image_url, is_active, store_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_active_product();