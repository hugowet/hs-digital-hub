CREATE TABLE public.amazon_carousel_controls (
 product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
 included boolean NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.amazon_carousel_controls TO anon, authenticated;
GRANT ALL ON public.amazon_carousel_controls TO service_role;
ALTER TABLE public.amazon_carousel_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public carousel decisions" ON public.amazon_carousel_controls FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id=product_id AND p.is_active AND p.supplier='amazon'));
CREATE POLICY "Owner reads carousel decisions" ON public.amazon_carousel_controls FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id=p.store_id WHERE p.id=product_id AND s.owner_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.manage_amazon_carousel(_store_id uuid, _product_ids uuid[], _include boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.stores WHERE id=_store_id AND owner_id=auth.uid() AND status='approved') THEN RAISE EXCEPTION 'Loja não autorizada.' USING ERRCODE='42501'; END IF;
 IF _include IS NULL OR _product_ids IS NULL OR cardinality(_product_ids) NOT BETWEEN 1 AND 50 OR cardinality(_product_ids)<>(SELECT count(DISTINCT id) FROM unnest(_product_ids) id) THEN RAISE EXCEPTION 'Selecione de 1 a 50 produtos diferentes.'; END IF;
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(74632051);
 PERFORM id FROM public.products WHERE id=ANY(_product_ids) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM public.products WHERE id=ANY(_product_ids) AND store_id=_store_id AND supplier='amazon')<>cardinality(_product_ids) THEN RAISE EXCEPTION 'Selecione apenas produtos Amazon da sua loja.' USING ERRCODE='42501'; END IF;
 IF _include AND EXISTS (SELECT 1 FROM public.products WHERE id=ANY(_product_ids) AND (NOT is_active OR stock<=0)) THEN RAISE EXCEPTION 'Só é possível incluir produtos publicados com estoque.'; END IF;
 IF _include AND (SELECT count(*) FROM public.amazon_carousel_controls c JOIN public.products p ON p.id=c.product_id WHERE c.included AND p.is_active AND p.stock>0 AND p.supplier='amazon' AND NOT (p.id=ANY(_product_ids)))+cardinality(_product_ids)>50 THEN RAISE EXCEPTION 'O carrossel comporta até 50 produtos selecionados manualmente.'; END IF;
 INSERT INTO public.amazon_carousel_controls(product_id,included,updated_at) SELECT id,_include,now() FROM unnest(_product_ids) id ON CONFLICT(product_id) DO UPDATE SET included=excluded.included,updated_at=excluded.updated_at;
 RETURN cardinality(_product_ids);
END $$;
REVOKE EXECUTE ON FUNCTION public.manage_amazon_carousel(uuid,uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_amazon_carousel(uuid,uuid[],boolean) TO authenticated;