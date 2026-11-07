CREATE OR REPLACE FUNCTION public.update_seller_product_full(_product_id uuid, _fields jsonb, _variations jsonb, _media jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE p public.products%ROWTYPE; m jsonb; urls text[] := ARRAY[]::text[]; pos integer := 0; path text;
BEGIN
 SELECT pr.* INTO p FROM public.products pr JOIN public.stores s ON s.id=pr.store_id WHERE pr.id=_product_id AND s.owner_id=auth.uid() AND s.status='approved' FOR UPDATE OF pr;
 IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado na sua loja aprovada.'; END IF;
 IF length(trim(_fields->>'title')) NOT BETWEEN 2 AND 160 OR (_fields->>'price')::numeric<=0 OR (_fields->>'stock')::integer<0 OR (_fields->>'shippingOrigin') NOT IN ('national','international') THEN RAISE EXCEPTION 'Dados inválidos.'; END IF;
 IF _media IS NOT NULL AND _media <> 'null'::jsonb THEN
  IF jsonb_typeof(_media)<>'array' OR jsonb_array_length(_media) NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'Informe de 1 a 10 fotos.'; END IF;
  FOR m IN SELECT value FROM jsonb_array_elements(_media) LOOP
   path:=m->>'storagePath';
   IF path IS NOT NULL THEN
    IF split_part(path,'/',1)<>p.store_id::text OR path LIKE '%..%' THEN RAISE EXCEPTION 'Foto não pertence à sua loja.'; END IF;
    urls:=array_append(urls,path);
   ELSE
    IF coalesce(m->>'url','') NOT LIKE 'https://%' OR m->>'url' LIKE '%/storage/v1/object/sign/%' THEN RAISE EXCEPTION 'Endereço de foto inválido.'; END IF;
    urls:=array_append(urls,m->>'url');
   END IF;
  END LOOP;
  DELETE FROM public.product_media WHERE product_id=p.id AND store_id=p.store_id;
  FOR m IN SELECT value FROM jsonb_array_elements(_media) LOOP
   IF m->>'storagePath' IS NOT NULL THEN
    INSERT INTO public.product_media(product_id,store_id,storage_path,media_type,mime_type,size_bytes,position) VALUES(p.id,p.store_id,m->>'storagePath',coalesce(m->>'mediaType','image'),m->>'mimeType',(m->>'sizeBytes')::bigint,pos);
   END IF;
   pos:=pos+1;
  END LOOP;
 END IF;
 UPDATE public.products SET title=trim(_fields->>'title'), description=_fields->>'description', description_long=nullif(_fields->>'descriptionLong',''), price=(_fields->>'price')::numeric, supplier_cost=(_fields->>'supplierCost')::numeric, stock=(_fields->>'stock')::integer, category=_fields->>'category', shipping_origin=_fields->>'shippingOrigin', weight_kg=(_fields->>'weightKg')::numeric, height_cm=(_fields->>'heightCm')::numeric, width_cm=(_fields->>'widthCm')::numeric, length_cm=(_fields->>'lengthCm')::numeric, variations=CASE WHEN _variations IS NULL OR _variations='null'::jsonb THEN p.variations ELSE _variations END, image_url=CASE WHEN cardinality(urls)>0 THEN urls[1] ELSE p.image_url END, gallery_urls=CASE WHEN cardinality(urls)>0 THEN urls ELSE p.gallery_urls END WHERE id=p.id AND store_id=p.store_id;
 RETURN p.id;
END $$;
REVOKE ALL ON FUNCTION public.update_seller_product_full(uuid,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_seller_product_full(uuid,jsonb,jsonb,jsonb) TO authenticated, service_role;