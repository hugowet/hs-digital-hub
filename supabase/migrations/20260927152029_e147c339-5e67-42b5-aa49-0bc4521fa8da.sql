CREATE OR REPLACE FUNCTION public.secure_abandoned_cart_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    NEW.contact_email := COALESCE(auth.jwt() ->> 'email', NEW.contact_email);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER abandoned_carts_secure_identity
BEFORE INSERT OR UPDATE ON public.abandoned_carts
FOR EACH ROW EXECUTE FUNCTION public.secure_abandoned_cart_identity();