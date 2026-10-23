CREATE TABLE public.product_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 author text NOT NULL CHECK (length(author) BETWEEN 1 AND 80), rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
 comment text NOT NULL CHECK (length(comment) BETWEEN 1 AND 4000), photo_paths text[] NOT NULL DEFAULT '{}',
 verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), CHECK (cardinality(photo_paths) <= 5)
);
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_public_read ON public.product_reviews FOR SELECT TO anon,authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id));
CREATE INDEX product_reviews_product_created ON public.product_reviews(product_id,created_at DESC);
CREATE POLICY review_photo_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='review-photos' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY review_photo_owner_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='review-photos' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY review_photo_public_read ON storage.objects FOR SELECT TO anon,authenticated USING (bucket_id='review-photos' AND EXISTS (SELECT 1 FROM public.product_reviews r WHERE name=ANY(r.photo_paths)));
CREATE POLICY review_photo_owner_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='review-photos' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS (SELECT 1 FROM public.product_reviews r WHERE name=ANY(r.photo_paths)));
CREATE FUNCTION public.publish_product_review(_id uuid,_product_id uuid,_author text,_rating integer,_comment text,_photo_paths text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_path text; v_verified boolean;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Faça login para avaliar.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.products p JOIN public.stores s ON s.id=p.store_id WHERE p.id=_product_id AND s.status='approved') THEN RAISE EXCEPTION 'Produto indisponível.'; END IF;
 IF cardinality(_photo_paths)>5 THEN RAISE EXCEPTION 'Selecione até 5 fotos.'; END IF;
 FOREACH v_path IN ARRAY _photo_paths LOOP
  IF v_path NOT LIKE v_user::text||'/'||_product_id::text||'/'||_id::text||'/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='review-photos' AND name=v_path) THEN RAISE EXCEPTION 'Foto inválida ou não enviada.'; END IF;
 END LOOP;
 SELECT EXISTS(SELECT 1 FROM public.orders o JOIN public.order_items i ON i.order_id=o.id WHERE o.buyer_id=v_user AND i.product_id=_product_id AND o.payment_status='approved') INTO v_verified;
 INSERT INTO public.product_reviews(id,product_id,user_id,author,rating,comment,photo_paths,verified) VALUES(_id,_product_id,v_user,trim(_author),_rating,trim(_comment),_photo_paths,v_verified);
 RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.publish_product_review(uuid,uuid,text,integer,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_product_review(uuid,uuid,text,integer,text,text[]) TO authenticated;
