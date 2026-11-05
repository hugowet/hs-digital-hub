ALTER TABLE public.amazon_carousel_controls ADD COLUMN IF NOT EXISTS slot integer CHECK (slot BETWEEN 1 AND 50);
CREATE OR REPLACE FUNCTION public.amazon_carousel_product_ids()
 RETURNS SETOF uuid LANGUAGE sql STABLE SET search_path TO 'public'
AS $f$
 SELECT p.id FROM public.products p LEFT JOIN public.amazon_carousel_controls c ON c.product_id=p.id
 WHERE p.is_active AND p.stock>0 AND p.supplier='amazon' AND (c.included IS NULL OR c.included)
 ORDER BY c.slot NULLS LAST, CASE WHEN c.included THEN 0 WHEN p.id='57d9fb51-cc36-42bb-8b1c-9a183d14bca9'::uuid THEN 1 ELSE 2 END,
 p.sold_count DESC NULLS LAST,p.id LIMIT 50;
$f$;
CREATE OR REPLACE FUNCTION public.set_amazon_carousel_slot(_store_id uuid, _product_id uuid, _slot integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.stores WHERE id=_store_id AND owner_id=auth.uid() AND status='approved') THEN RAISE EXCEPTION 'Loja não autorizada.' USING ERRCODE='42501'; END IF;
 IF _slot IS NOT NULL AND _slot NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Escolha uma posição de 1 a 50.'; END IF;
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(74632051);
 IF NOT EXISTS (SELECT 1 FROM public.products WHERE id=_product_id AND store_id=_store_id AND supplier='amazon') THEN RAISE EXCEPTION 'Selecione um produto Amazon da sua loja.' USING ERRCODE='42501'; END IF;
 IF _slot IS NOT NULL AND EXISTS (SELECT 1 FROM public.products WHERE id=_product_id AND (NOT is_active OR stock<=0)) THEN RAISE EXCEPTION 'Só é possível posicionar produtos publicados com estoque.'; END IF;
 UPDATE public.amazon_carousel_controls SET slot=NULL WHERE slot=_slot AND product_id<>_product_id;
 INSERT INTO public.amazon_carousel_controls(product_id,included,slot,updated_at) VALUES (_product_id,true,_slot,now())
 ON CONFLICT(product_id) DO UPDATE SET slot=excluded.slot, included=CASE WHEN excluded.slot IS NULL THEN public.amazon_carousel_controls.included ELSE true END, updated_at=now();
END $f$;
REVOKE ALL ON FUNCTION public.set_amazon_carousel_slot(uuid,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_amazon_carousel_slot(uuid,uuid,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.amazon_carousel_slots()
 RETURNS TABLE(product_id uuid, slot integer) LANGUAGE sql STABLE SET search_path TO 'public'
AS $f$ SELECT c.product_id, c.slot FROM public.amazon_carousel_controls c WHERE c.slot IS NOT NULL AND c.included $f$;
GRANT EXECUTE ON FUNCTION public.amazon_carousel_slots() TO anon, authenticated;