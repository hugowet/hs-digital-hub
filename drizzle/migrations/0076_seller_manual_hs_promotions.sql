CREATE OR REPLACE FUNCTION public.hs_promo_price(_regular numeric, _cost numeric, _share numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c numeric; m numeric; p numeric;
BEGIN
 SELECT commission_rate INTO c FROM platform_settings WHERE id;
 IF _regular IS NULL OR _cost IS NULL OR _cost <= 0 OR c IS NULL OR c < 0 OR c >= 1 OR _share NOT IN (0.25,0.35,0.5) OR _share IS NULL THEN RETURN NULL; END IF;
 m := _regular * (1-c) - _cost;
 IF m <= 0 THEN RETURN NULL; END IF;
 p := ceil(((_cost + m * (1-_share))/(1-c))*100)/100;
 IF p >= _regular OR p - round(p*c,2) - _cost <= 0 THEN RETURN NULL; END IF;
 RETURN p;
END $$;
REVOKE EXECUTE ON FUNCTION public.hs_promo_price(numeric,numeric,numeric) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.limit_hs_promotions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(74632050);
 IF NEW.ends_at > now() AND (TG_OP='INSERT' OR OLD.ends_at <= now()) AND (SELECT count(*) FROM hs_promotions WHERE ends_at > now() AND product_id <> NEW.product_id) >= 50 THEN
 RAISE EXCEPTION 'O carrossel permite no máximo 50 produtos.';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER limit_hs_promotions BEFORE INSERT OR UPDATE OF ends_at ON public.hs_promotions FOR EACH ROW EXECUTE FUNCTION public.limit_hs_promotions();
REVOKE EXECUTE ON FUNCTION public.limit_hs_promotions() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.manage_seller_hs_promotions(_store_id uuid, _product_ids uuid[], _share numeric, _remove boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; prior hs_promotions; regular numeric; comparison numeric; discount numeric; expiry timestamptz; n integer := 0; c numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM stores s JOIN profiles u ON u.id=s.owner_id WHERE s.id=_store_id AND s.owner_id=auth.uid() AND s.status='approved' AND lower(u.email)='hugohug12ou@gmail.com') THEN RAISE EXCEPTION 'Acesso não permitido.' USING ERRCODE='42501'; END IF;
 IF _product_ids IS NULL OR cardinality(_product_ids) NOT BETWEEN 1 AND 50 OR cardinality(_product_ids) <> (SELECT count(DISTINCT x) FROM unnest(_product_ids) x) THEN RAISE EXCEPTION 'Selecione de 1 a 50 produtos diferentes.'; END IF;
 IF _remove IS NULL OR (NOT _remove AND (_share IS NULL OR _share NOT IN (0.25,0.35,0.5))) THEN RAISE EXCEPTION 'Escolha 25%%, 35%% ou 50%% da margem.'; END IF;
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(74632050);
 IF (SELECT count(*) FROM products WHERE id=ANY(_product_ids) AND store_id=_store_id AND supplier='amazon') <> cardinality(_product_ids) THEN RAISE EXCEPTION 'Selecione apenas produtos Amazon da sua loja.' USING ERRCODE='42501'; END IF;
 SELECT commission_rate INTO c FROM platform_settings WHERE id;
 FOR r IN SELECT * FROM products WHERE id=ANY(_product_ids) ORDER BY id FOR UPDATE LOOP
   SELECT * INTO prior FROM hs_promotions WHERE product_id=r.id;
   regular := CASE WHEN prior.product_id IS NOT NULL THEN prior.regular_price ELSE r.price END;
   comparison := CASE WHEN prior.product_id IS NOT NULL THEN prior.regular_compare_at_price ELSE r.compare_at_price END;
   expiry := CASE WHEN prior.ends_at > now() THEN prior.ends_at ELSE now()+interval '15 days' END;
   IF NOT _remove THEN
     IF NOT r.is_active OR r.supplier_cost_currency IS NOT NULL AND r.supplier_cost_currency <> 'BRL' THEN RAISE EXCEPTION 'Produto inativo ou custo em reais não confirmado: %', r.title; END IF;
     discount := hs_promo_price(regular,r.supplier_cost,_share);
     IF discount IS NULL THEN RAISE EXCEPTION 'Margem insuficiente ou custo não confirmado: %',r.title; END IF;
   END IF;
   DELETE FROM hs_promotions WHERE product_id=r.id;
   UPDATE products SET price=CASE WHEN _remove THEN regular ELSE discount END, compare_at_price=CASE WHEN _remove THEN comparison ELSE regular END WHERE id=r.id;
   IF NOT _remove THEN
     INSERT INTO hs_promotions(product_id,regular_price,regular_compare_at_price,promo_price,margin_share,ends_at,position) VALUES(r.id,regular,comparison,discount,_share,expiry,coalesce(prior.position,(SELECT coalesce(max(position),0)+1 FROM hs_promotions)));
   END IF;
   n := n+1;
 END LOOP;
 RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.manage_seller_hs_promotions(uuid,uuid[],numeric,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_seller_hs_promotions(uuid,uuid[],numeric,boolean) TO authenticated;
CREATE POLICY "Titular consulta suas promoções" ON public.hs_promotions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id=p.store_id WHERE p.id=product_id AND s.owner_id=auth.uid()));