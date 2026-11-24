CREATE OR REPLACE FUNCTION public.text_looks_english(t text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(t,'') ~* '\m(for|with|and|the|women|womens|men|mens|kids|new|portable|wireless|dress|shoes|case|style|fashion)\M'
     AND coalesce(t,'') !~* '[ãõçáéíóúâêôà]|\m(de|para|com|do|da|dos|das|em|feminino|feminina|masculino|masculina)\M'
$$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hidden_untranslated boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.flag_untranslated_product() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.hidden_untranslated := public.text_looks_english(NEW.title)
    OR public.text_looks_english(left(coalesce(NEW.description,''), 300));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS flag_untranslated_product ON public.products;
CREATE TRIGGER flag_untranslated_product BEFORE INSERT OR UPDATE OF title, description ON public.products
FOR EACH ROW EXECUTE FUNCTION public.flag_untranslated_product();

UPDATE public.products SET hidden_untranslated = true
WHERE is_active AND (public.text_looks_english(title) OR public.text_looks_english(left(coalesce(description,''),300)));

DROP POLICY IF EXISTS "active products are public" ON public.products;
CREATE POLICY "active products are public" ON public.products FOR SELECT
USING (is_active = true AND hidden_untranslated = false);