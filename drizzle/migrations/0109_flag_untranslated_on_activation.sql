DROP TRIGGER IF EXISTS flag_untranslated_product ON public.products;
CREATE TRIGGER flag_untranslated_product BEFORE INSERT OR UPDATE OF title, description, is_active ON public.products
FOR EACH ROW EXECUTE FUNCTION public.flag_untranslated_product();