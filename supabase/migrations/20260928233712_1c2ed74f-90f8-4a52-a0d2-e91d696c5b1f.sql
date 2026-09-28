CREATE OR REPLACE FUNCTION public.create_seller_product(_title text, _price numeric, _stock integer, _category text, _product_type text, _delivery_url text, _media jsonb)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'storage'
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
  allowed_categories constant text[] := ARRAY[
    'digitais-templates', 'cursos-infoprodutos', 'eletronicos-gadgets',
    'perifericos-acessorios', 'casa-setup', 'eletronicos', 'moda', 'casa',
    'beleza', 'games', 'esportes', 'infantil', 'mercado'
  ];
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
  IF _category IS NULL OR NOT (_category = ANY(allowed_categories)) THEN
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
  IF media_count > 0 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(_media) AS value
    WHERE value ->> 'mediaType' = 'image'
  ) THEN
    RAISE EXCEPTION 'Inclua ao menos uma foto para usar como capa.';
  END IF;

  FOR media_item IN SELECT value FROM jsonb_array_elements(COALESCE(_media, '[]'::jsonb)) LOOP
    BEGIN
      media_position := (media_item ->> 'position')::integer;
      media_path := media_item ->> 'storagePath';
      media_kind := media_item ->> 'mediaType';
      media_mime := media_item ->> 'mimeType';
      media_size := (media_item ->> 'sizeBytes')::bigint;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Uma das mídias é inválida.';
    END;

    IF media_position NOT BETWEEN 0 AND 9
       OR media_kind NOT IN ('image', 'video')
       OR media_path IS NULL
       OR split_part(media_path, '/', 1) <> owned_store_id::text
       OR media_path LIKE '%..%'
       OR (media_kind = 'image' AND (media_mime NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') OR media_size > 10485760))
       OR (media_kind = 'video' AND (media_mime NOT IN ('video/mp4', 'video/webm', 'video/quicktime') OR media_size > 52428800)) THEN
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

REVOKE ALL ON FUNCTION public.create_seller_product(text, numeric, integer, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_seller_product(text, numeric, integer, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_seller_product(text, numeric, integer, text, text, text, jsonb) TO service_role;