CREATE OR REPLACE FUNCTION public.create_seller_product_v5(_title text, _description text, _price numeric, _stock integer, _category text, _product_type text, _delivery_url text, _media jsonb, _weight_kg numeric, _height_cm numeric, _width_cm numeric, _length_cm numeric, _shipping_origin text, _variations jsonb, _compare_at_price numeric, _supplier_cost numeric) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE pid uuid;
BEGIN
 IF _compare_at_price IS NOT NULL AND _compare_at_price<=_price THEN RAISE EXCEPTION 'O preço anterior deve ser maior que o preço de venda.'; END IF;
 IF _supplier_cost<0 THEN RAISE EXCEPTION 'Custo inválido.'; END IF;
 pid:=public.create_seller_product_v4(_title,_description,_price,_stock,_category,_product_type,_delivery_url,_media,_weight_kg,_height_cm,_width_cm,_length_cm,_shipping_origin,_variations);
 UPDATE public.products SET compare_at_price=_compare_at_price,supplier_cost=_supplier_cost WHERE id=pid;
 RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.create_seller_product_v5(text,text,numeric,integer,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,jsonb,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_seller_product_v5(text,text,numeric,integer,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,jsonb,numeric,numeric) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.update_seller_product_priced(_product_id uuid, _fields jsonb, _variations jsonb, _media jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE pid uuid;
BEGIN
 IF (_fields->>'compareAtPrice')::numeric IS NOT NULL AND (_fields->>'compareAtPrice')::numeric<=(_fields->>'price')::numeric THEN RAISE EXCEPTION 'O preço anterior deve ser maior que o preço de venda.'; END IF;
 pid:=public.update_seller_product_full(_product_id,_fields,_variations,_media);
 UPDATE public.products SET compare_at_price=(_fields->>'compareAtPrice')::numeric WHERE id=pid;
 RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.update_seller_product_priced(uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_seller_product_priced(uuid,jsonb,jsonb,jsonb) TO authenticated,service_role;