ALTER TABLE public.products ADD COLUMN shipping_origin text;
ALTER TABLE public.products ADD CONSTRAINT products_shipping_origin_valid CHECK (shipping_origin IN ('national','international'));
CREATE OR REPLACE FUNCTION public.create_seller_product_v4(_title text, _description text, _price numeric, _stock integer, _category text, _product_type text, _delivery_url text, _media jsonb, _weight_kg numeric, _height_cm numeric, _width_cm numeric, _length_cm numeric, _shipping_origin text, _variations jsonb) RETURNS uuid LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE product_id uuid; g jsonb; o jsonb; names text[] := ARRAY[]::text[];
BEGIN
 IF _shipping_origin IS NULL OR _shipping_origin NOT IN ('national','international') THEN RAISE EXCEPTION 'Selecione envio nacional ou importado.'; END IF;
 IF _variations IS NULL OR jsonb_typeof(_variations) <> 'array' OR jsonb_array_length(_variations)>3 THEN RAISE EXCEPTION 'Opções inválidas.'; END IF;
 FOR g IN SELECT value FROM jsonb_array_elements(_variations) LOOP
  IF jsonb_typeof(g)<>'object' OR coalesce(g->>'name','') NOT IN ('Cor','Tamanho','Tamanho (US)') OR g->>'name'=ANY(names) THEN RAISE EXCEPTION 'Grupo de opções inválido.'; END IF;
  names:=array_append(names,g->>'name');
  IF jsonb_typeof(g->'options') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Lista de opções inválida.'; END IF;
  IF jsonb_array_length(g->'options') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Quantidade de opções inválida.'; END IF;
  FOR o IN SELECT value FROM jsonb_array_elements(g->'options') LOOP
   IF jsonb_typeof(o)<>'string' OR char_length(trim(o#>>'{}')) NOT BETWEEN 1 AND 80 OR (o#>>'{}') ~ '[:·]' THEN RAISE EXCEPTION 'Cor ou tamanho inválido.'; END IF;
  END LOOP;
 END LOOP;
 product_id:=public.create_seller_product_v3(_title,_description,_price,_stock,_category,_product_type,_delivery_url,_media,_weight_kg,_height_cm,_width_cm,_length_cm);
 UPDATE public.products SET shipping_origin=_shipping_origin, variations=_variations WHERE id=product_id AND store_id IN (SELECT id FROM public.stores WHERE owner_id=auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado na sua loja.'; END IF;
 RETURN product_id;
END $$;
REVOKE ALL ON FUNCTION public.create_seller_product_v4(text,text,numeric,integer,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_seller_product_v4(text,text,numeric,integer,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,jsonb) TO authenticated, service_role;