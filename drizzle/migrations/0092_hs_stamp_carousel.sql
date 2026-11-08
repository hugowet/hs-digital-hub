CREATE TABLE public.hs_stamp_carousel (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hs_stamp_carousel TO anon, authenticated;
GRANT ALL ON public.hs_stamp_carousel TO service_role;
ALTER TABLE public.hs_stamp_carousel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads stamp carousel" ON public.hs_stamp_carousel FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.manage_hs_stamp_carousel(_store_id uuid, _product_ids uuid[], _include boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.stores WHERE id=_store_id AND owner_id=auth.uid() AND status='approved') THEN
    RAISE EXCEPTION 'Loja não autorizada.' USING ERRCODE='42501'; END IF;
  IF _product_ids IS NULL OR cardinality(_product_ids) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Selecione de 1 a 30 produtos.'; END IF;
  PERFORM pg_advisory_xact_lock(74632052);
  IF (SELECT count(*) FROM public.products WHERE id=ANY(_product_ids) AND store_id=_store_id) <> (SELECT count(DISTINCT x) FROM unnest(_product_ids) x) THEN
    RAISE EXCEPTION 'Selecione apenas produtos da sua loja.' USING ERRCODE='42501'; END IF;
  IF _include THEN
    IF EXISTS (SELECT 1 FROM public.products WHERE id=ANY(_product_ids) AND NOT is_active) THEN RAISE EXCEPTION 'Só produtos publicados.'; END IF;
    IF (SELECT count(*) FROM public.hs_stamp_carousel c WHERE NOT c.product_id=ANY(_product_ids)) + (SELECT count(DISTINCT x) FROM unnest(_product_ids) x) > 30 THEN
      RAISE EXCEPTION 'O carrossel HS Estampas comporta até 30 produtos.'; END IF;
    INSERT INTO public.hs_stamp_carousel(product_id) SELECT DISTINCT x FROM unnest(_product_ids) x ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.hs_stamp_carousel WHERE product_id=ANY(_product_ids);
  END IF;
  RETURN cardinality(_product_ids);
END $$;
REVOKE ALL ON FUNCTION public.manage_hs_stamp_carousel(uuid, uuid[], boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.manage_hs_stamp_carousel(uuid, uuid[], boolean) TO authenticated;