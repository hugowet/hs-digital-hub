CREATE OR REPLACE FUNCTION public.create_seller_product_v6(_title text, _description text, _price numeric, _stock integer, _category text, _product_type text, _delivery_url text, _media jsonb, _weight_kg numeric, _height_cm numeric, _width_cm numeric, _length_cm numeric, _shipping_origin text, _variations jsonb, _compare_at_price numeric, _supplier_cost numeric, _color_images jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE pid uuid; entry record; groups jsonb; colors jsonb;
BEGIN
 IF jsonb_typeof(_color_images) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Fotos por cor inválidas.'; END IF;
 SELECT g->'options' INTO colors FROM jsonb_array_elements(_variations) g WHERE g->>'name'='Cor';
 FOR entry IN SELECT key,value FROM jsonb_each_text(_color_images) LOOP
  IF NOT coalesce(colors ? entry.key,false) OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(_media) m WHERE m->>'storagePath'=entry.value AND m->>'mediaType'='image') THEN RAISE EXCEPTION 'Vincule uma foto do produto à cor cadastrada.'; END IF;
 END LOOP;
 pid:=public.create_seller_product_v5(_title,_description,_price,_stock,_category,_product_type,_delivery_url,_media,_weight_kg,_height_cm,_width_cm,_length_cm,_shipping_origin,_variations,_compare_at_price,_supplier_cost);
 SELECT coalesce(jsonb_agg(CASE WHEN g->>'name'='Cor' THEN g || jsonb_build_object('images',_color_images) ELSE g END),'[]'::jsonb) INTO groups FROM jsonb_array_elements(_variations) g;
 UPDATE public.products SET variations=groups WHERE id=pid AND store_id IN (SELECT id FROM public.stores WHERE owner_id=auth.uid());
 RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.create_seller_product_v6(text,text,numeric,integer,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,jsonb,numeric,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_seller_product_v6(text,text,numeric,integer,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,jsonb,numeric,numeric,jsonb) TO authenticated,service_role;