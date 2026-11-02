CREATE TABLE public.hs_promotions (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  regular_price numeric NOT NULL CHECK (regular_price > 0),
  regular_compare_at_price numeric,
  promo_price numeric NOT NULL CHECK (promo_price > 0),
  margin_share numeric NOT NULL DEFAULT 0.5 CHECK (margin_share > 0 AND margin_share < 1),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (promo_price < regular_price)
);
GRANT SELECT ON public.hs_promotions TO anon, authenticated;
GRANT ALL ON public.hs_promotions TO service_role;
ALTER TABLE public.hs_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promoções ativas são públicas" ON public.hs_promotions FOR SELECT TO anon, authenticated USING (ends_at > now());

-- Preço promocional que mantém exatamente a fatia de margem pedida, arredondado para cima em ,90.
CREATE OR REPLACE FUNCTION public.hs_promo_price(_regular numeric, _cost numeric, _share numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c numeric; m numeric; p numeric;
BEGIN
  SELECT commission_rate INTO c FROM platform_settings WHERE id;
  IF _cost IS NULL OR _cost <= 0 OR c IS NULL THEN RETURN NULL; END IF;
  m := _regular * (1 - c) - _cost;
  IF m <= 1 THEN RETURN NULL; END IF;
  p := (_cost + m * (1 - _share)) / (1 - c);
  p := ceil(p - 0.9) + 0.9;
  IF p >= _regular OR p * (1 - c) - _cost <= 0 THEN RETURN NULL; END IF;
  RETURN p;
END $$;
REVOKE EXECUTE ON FUNCTION public.hs_promo_price(numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;

-- Mantém a promoção lucrativa quando a sincronização muda custo ou preço.
CREATE OR REPLACE FUNCTION public.guard_hs_promotion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE promo hs_promotions; regular numeric; p numeric;
BEGIN
  SELECT * INTO promo FROM hs_promotions WHERE product_id = NEW.id AND ends_at > now();
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.price IS DISTINCT FROM OLD.price THEN regular := NEW.price; ELSE regular := promo.regular_price; END IF;
  IF NEW.price IS DISTINCT FROM OLD.price OR NEW.supplier_cost IS DISTINCT FROM OLD.supplier_cost THEN
    p := hs_promo_price(regular, NEW.supplier_cost, promo.margin_share);
    IF p IS NULL THEN
      DELETE FROM hs_promotions WHERE product_id = NEW.id;
      NEW.price := regular; NEW.compare_at_price := promo.regular_compare_at_price;
    ELSE
      UPDATE hs_promotions SET regular_price = regular, promo_price = p WHERE product_id = NEW.id;
      NEW.price := p; NEW.compare_at_price := regular;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_hs_promotion BEFORE UPDATE OF price, supplier_cost ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_hs_promotion();

-- Encerra promoções vencidas devolvendo o preço normal.
CREATE OR REPLACE FUNCTION public.end_expired_hs_promotions() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH ended AS (DELETE FROM hs_promotions WHERE ends_at <= now() RETURNING *)
  UPDATE products p SET price = e.regular_price, compare_at_price = e.regular_compare_at_price
  FROM ended e WHERE p.id = e.product_id AND p.price = e.promo_price;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.end_expired_hs_promotions() FROM PUBLIC, anon, authenticated;