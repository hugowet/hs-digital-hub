CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 9),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, position),
  UNIQUE (storage_path)
);
GRANT SELECT ON public.product_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_media TO authenticated;
GRANT ALL ON public.product_media TO service_role;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads active product media" ON public.product_media
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.id = product_media.product_id AND p.is_active = true
));
CREATE POLICY "sellers read own product media" ON public.product_media
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = product_media.store_id AND s.owner_id = auth.uid()
));
CREATE POLICY "sellers insert own product media" ON public.product_media
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = product_media.store_id AND s.owner_id = auth.uid()
));
CREATE POLICY "sellers update own product media" ON public.product_media
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = product_media.store_id AND s.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = product_media.store_id AND s.owner_id = auth.uid()
));
CREATE POLICY "sellers delete own product media" ON public.product_media
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = product_media.store_id AND s.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "sellers upload product images" ON storage.objects;
DROP POLICY IF EXISTS "sellers manage product images" ON storage.objects;
CREATE POLICY "sellers upload product media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM public.stores s WHERE s.owner_id = auth.uid()
  )
  AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif','mp4','webm','mov')
);
CREATE POLICY "sellers update product media" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM public.stores s WHERE s.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM public.stores s WHERE s.owner_id = auth.uid()
  )
  AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif','mp4','webm','mov')
);

CREATE OR REPLACE FUNCTION public.create_seller_product(
  _title text,
  _price numeric,
  _stock integer,
  _category text,
  _product_type text,
  _delivery_url text,
  _media jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  owned_store_id uuid;
  new_product_id uuid := gen_random_uuid();
  media_item jsonb;
  media_count integer;
  media_position integer;
  media_path text;
  media_kind text;
  media_mime text;
  media_size bigint;
  object_row record;
  cover_url text;
  legacy_gallery text[] := ARRAY[]::text[];
BEGIN
  IF current_user_id IS NULL OR NOT public.has_role(current_user_id, 'seller') THEN
    RAISE EXCEPTION 'Entre com uma conta de vendedor para cadastrar produtos.';
  END IF;

  SELECT s.id INTO owned_store_id
  FROM public.stores s
  WHERE s.owner_id = current_user_id
  LIMIT 1;

  IF owned_store_id IS NULL THEN
    RAISE EXCEPTION 'Loja do vendedor não encontrada.';
  END IF;
  IF char_length(trim(COALESCE(_title, ''))) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'O título deve ter entre 2 e 160 caracteres.';
  END IF;
  IF _price IS NULL OR _price <= 0 OR _price > 99999999.99 THEN
    RAISE EXCEPTION 'Informe um preço válido.';
  END IF;
  IF _stock IS NULL OR _stock < 0 OR _stock > 1000000 THEN
    RAISE EXCEPTION 'Informe um estoque válido.';
  END IF;
  IF _category IS NULL OR char_length(_category) > 80 THEN
    RAISE EXCEPTION 'Categoria inválida.';
  END IF;
  IF _product_type NOT IN ('physical', 'digital') THEN
    RAISE EXCEPTION 'Tipo de produto inválido.';
  END IF;
  IF _product_type = 'digital' AND (_delivery_url IS NULL OR _delivery_url !~ '^https://') THEN
    RAISE EXCEPTION 'Informe um link HTTPS de entrega válido.';
  END IF;
  IF jsonb_typeof(COALESCE(_media, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Lista de mídias inválida.';
  END IF;

  media_count := jsonb_array_length(COALESCE(_media, '[]'::jsonb));
  IF media_count > 10 THEN
    RAISE EXCEPTION 'Envie no máximo 10 fotos ou vídeos.';
  END IF;

  FOR media_item IN SELECT value FROM jsonb_array_elements(COALESCE(_media, '[]'::jsonb)) LOOP
    media_position := (media_item ->> 'position')::integer;
    media_path := media_item ->> 'storagePath';
    media_kind := media_item ->> 'mediaType';
    media_mime := media_item ->> 'mimeType';
    media_size := (media_item ->> 'sizeBytes')::bigint;

    IF media_position NOT BETWEEN 0 AND 9
       OR media_kind NOT IN ('image', 'video')
       OR media_path IS NULL
       OR split_part(media_path, '/', 1) <> owned_store_id::text
       OR media_path LIKE '%..%'
       OR (media_kind = 'image' AND (media_mime NOT LIKE 'image/%' OR media_size > 10485760))
       OR (media_kind = 'video' AND (media_mime NOT LIKE 'video/%' OR media_size > 52428800)) THEN
      RAISE EXCEPTION 'Uma das mídias é inválida.';
    END IF;

    SELECT o.name, o.metadata INTO object_row
    FROM storage.objects o
    WHERE o.bucket_id = 'product-images' AND o.name = media_path;

    IF NOT FOUND
       OR COALESCE((object_row.metadata ->> 'size')::bigint, -1) <> media_size
       OR COALESCE(object_row.metadata ->> 'mimetype', '') <> media_mime THEN
      RAISE EXCEPTION 'Não foi possível validar uma das mídias enviadas.';
    END IF;

    IF media_kind = 'image' AND cover_url IS NULL THEN
      cover_url := media_path;
    END IF;
    legacy_gallery := array_append(legacy_gallery, media_path);
  END LOOP;

  INSERT INTO public.products (
    id, store_id, title, price, stock, category, product_type,
    image_url, gallery_urls, is_active
  ) VALUES (
    new_product_id, owned_store_id, trim(_title), round(_price, 2), _stock,
    _category, _product_type, cover_url, legacy_gallery, true
  );

  INSERT INTO public.product_media (
    product_id, store_id, storage_path, media_type, mime_type, size_bytes, position
  )
  SELECT new_product_id, owned_store_id,
         item ->> 'storagePath', item ->> 'mediaType', item ->> 'mimeType',
         (item ->> 'sizeBytes')::bigint, (item ->> 'position')::integer
  FROM jsonb_array_elements(COALESCE(_media, '[]'::jsonb)) AS item;

  IF _product_type = 'digital' THEN
    INSERT INTO public.digital_product_assets (product_id, store_id, delivery_url)
    VALUES (new_product_id, owned_store_id, trim(_delivery_url));
  END IF;

  RETURN new_product_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_seller_product(text, numeric, integer, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_seller_product(text, numeric, integer, text, text, text, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_marketplace_order(_items jsonb, _shipping_address jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  current_item jsonb;
  product_row record;
  v_order_id uuid;
  product_id_value uuid;
  quantity_value integer;
  products_total numeric(12,2) := 0;
  shipping_total numeric(12,2) := 0;
  total_fee numeric(12,2) := 0;
  total_seller numeric(12,2) := 0;
  item_total numeric(12,2);
  item_fee numeric(12,2);
  rate numeric(5,4);
  seen_products uuid[] := ARRAY[]::uuid[];
  stores_with_paid_shipping uuid[] := ARRAY[]::uuid[];
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM set_config('statement_timeout', '15s', true);

  IF current_user_id IS NULL OR NOT public.has_role(current_user_id, 'buyer') THEN
    RAISE EXCEPTION 'Entre com uma conta de Comprador para finalizar o pedido.';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 50 THEN
    RAISE EXCEPTION 'O pedido precisa ter entre 1 e 50 produtos.';
  END IF;
  IF jsonb_typeof(_shipping_address) <> 'object'
     OR char_length(trim(COALESCE(_shipping_address ->> 'name', ''))) NOT BETWEEN 2 AND 100
     OR char_length(trim(COALESCE(_shipping_address ->> 'address', ''))) NOT BETWEEN 5 AND 200
     OR char_length(trim(COALESCE(_shipping_address ->> 'city', ''))) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Preencha corretamente os dados de entrega.';
  END IF;

  SELECT commission_rate INTO rate FROM public.platform_settings WHERE id = true;
  rate := COALESCE(rate, 0.1200);

  FOR current_item IN
    SELECT value FROM jsonb_array_elements(_items)
    ORDER BY value ->> 'product_id'
  LOOP
    BEGIN
      product_id_value := (current_item ->> 'product_id')::uuid;
      quantity_value := (current_item ->> 'quantity')::integer;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Produto ou quantidade inválida.';
    END;
    IF quantity_value < 1 OR quantity_value > 99 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    IF product_id_value = ANY(seen_products) THEN RAISE EXCEPTION 'Produto duplicado.'; END IF;
    seen_products := array_append(seen_products, product_id_value);

    SELECT p.id, p.store_id, p.title, p.price, p.stock, p.free_shipping, p.product_type,
           p.is_active, s.status, s.mercado_pago_status
      INTO product_row
      FROM public.products p JOIN public.stores s ON s.id = p.store_id
     WHERE p.id = product_id_value FOR UPDATE OF p;

    IF NOT FOUND OR NOT product_row.is_active OR product_row.status <> 'approved' THEN
      RAISE EXCEPTION 'Um produto não está mais disponível.';
    END IF;
    IF product_row.mercado_pago_status <> 'connected' THEN
      RAISE EXCEPTION 'Uma loja ainda não conectou a carteira Mercado Pago.';
    END IF;
    IF product_row.stock < quantity_value THEN
      RAISE EXCEPTION 'Estoque insuficiente para %.', product_row.title;
    END IF;

    item_total := round(product_row.price * quantity_value, 2);
    products_total := products_total + item_total;
    item_fee := round(item_total * rate, 2);
    total_fee := total_fee + item_fee;
    total_seller := total_seller + item_total - item_fee;
    IF product_row.product_type <> 'digital'
       AND NOT product_row.free_shipping
       AND NOT product_row.store_id = ANY(stores_with_paid_shipping) THEN
      stores_with_paid_shipping := array_append(stores_with_paid_shipping, product_row.store_id);
      shipping_total := shipping_total + 19.90;
    END IF;
  END LOOP;

  INSERT INTO public.orders (
    buyer_id, total, platform_fee, seller_amount, status, payment_status,
    payment_provider, shipping_address
  ) VALUES (
    current_user_id, products_total + shipping_total, total_fee,
    total_seller + shipping_total, 'awaiting_payment', 'pending', 'mercadopago',
    jsonb_build_object(
      'name', trim(_shipping_address ->> 'name'),
      'phone', left(trim(COALESCE(_shipping_address ->> 'phone', '')), 20),
      'address', trim(_shipping_address ->> 'address'),
      'city', trim(_shipping_address ->> 'city'),
      'note', left(trim(COALESCE(_shipping_address ->> 'note', '')), 200),
      'shipping_total', shipping_total
    )
  ) RETURNING id INTO v_order_id;

  FOR current_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    product_id_value := (current_item ->> 'product_id')::uuid;
    quantity_value := (current_item ->> 'quantity')::integer;
    SELECT p.id, p.store_id, p.title, p.price INTO product_row
    FROM public.products p WHERE p.id = product_id_value;
    item_total := round(product_row.price * quantity_value, 2);
    item_fee := round(item_total * rate, 2);
    INSERT INTO public.order_items (
      order_id, product_id, store_id, title, unit_price, quantity,
      platform_fee, seller_amount, commission_rate
    ) VALUES (
      v_order_id, product_row.id, product_row.store_id, product_row.title,
      product_row.price, quantity_value, item_fee, item_total - item_fee, rate
    );
    UPDATE public.products SET stock = stock - quantity_value WHERE id = product_row.id;
  END LOOP;

  INSERT INTO public.payment_transactions (
    order_id, store_id, buyer_id, gross_amount, platform_fee, seller_amount
  )
  SELECT v_order_id, oi.store_id, current_user_id,
         sum(oi.unit_price * oi.quantity)
           + CASE WHEN bool_or(p.product_type <> 'digital' AND NOT p.free_shipping) THEN 19.90 ELSE 0 END,
         sum(oi.platform_fee),
         sum(oi.seller_amount)
           + CASE WHEN bool_or(p.product_type <> 'digital' AND NOT p.free_shipping) THEN 19.90 ELSE 0 END
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order_id
  GROUP BY oi.store_id;

  RETURN v_order_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_marketplace_order(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(jsonb, jsonb) TO authenticated, service_role;