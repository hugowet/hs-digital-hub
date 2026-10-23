-- 1) Toda conta nova entra como comprador (admin continua pelo e-mail)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.app_role;
BEGIN
  requested_role := CASE
    WHEN lower(NEW.email) = 'hugoet373@gmail.com' THEN 'admin'::public.app_role
    ELSE 'buyer'::public.app_role
  END;

  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE WHEN requested_role = 'admin' THEN 'buyer'::public.app_role ELSE requested_role END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2) Repasse bloqueado até a entrega (proteção contra golpe)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'held';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_released_at timestamptz;

CREATE OR REPLACE FUNCTION public.release_payout_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.payout_status = 'held' THEN
    NEW.payout_status := 'released';
    NEW.payout_released_at := now();

    UPDATE public.stores s
    SET balance = s.balance + COALESCE((
      SELECT SUM(oi.seller_amount)
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.store_id = s.id
    ), 0)
    WHERE s.id IN (SELECT DISTINCT store_id FROM public.order_items WHERE order_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_payout_on_delivery ON public.orders;
CREATE TRIGGER trg_release_payout_on_delivery
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.release_payout_on_delivery();

-- 3) Aprovação de vendedor: só o admin aprova e o papel de vendedor é concedido na aprovação
CREATE OR REPLACE FUNCTION public.approve_seller_store(_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas o administrador pode aprovar vendedores.';
  END IF;

  UPDATE public.stores SET status = 'approved' WHERE id = _store_id RETURNING owner_id INTO _owner;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Loja não encontrada.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_owner, 'seller'::public.app_role)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_seller_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_seller_store(uuid) TO authenticated;