CREATE OR REPLACE FUNCTION public.create_marketplace_order(
  _items jsonb,
  _shipping_address jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_item jsonb;
  product_row record;
  order_id uuid;
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
  seen_stores uuid[] := ARRAY[]::uuid[];
  stores_with_paid_shipping uuid[] := ARRAY[]::uuid[];
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Faça login para finalizar o pedido.';
  END IF;

  IF NOT public.has_role(current_user_id, 'buyer') THEN
    RAISE EXCEPTION 'Use uma conta de Comprador para finalizar pedidos.';
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

  FOR current_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    BEGIN
      product_id_value := (current_item ->> 'product_id')::uuid;
      quantity_value := (current_item ->> 'quantity')::integer;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Produto ou quantidade inválida.';
    END;

    IF quantity_value < 1 OR quantity_value > 99 THEN
      RAISE EXCEPTION 'A quantidade deve estar entre 1 e 99.';
    END IF;

    IF product_id_value = ANY(seen_products) THEN
      RAISE EXCEPTION 'O pedido contém um produto duplicado.';
    END IF;
    seen_products := array_append(seen_products, product_id_value);

    SELECT p.id, p.store_id, p.title, p.price, p.stock, p.free_shipping,
           p.is_active, s.status, s.pix_key
      INTO product_row
      FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
     WHERE p.id = product_id_value
     FOR UPDATE OF p;

    IF NOT FOUND OR NOT product_row.is_active OR product_row.status <> 'approved' THEN
      RAISE EXCEPTION 'Um produto não está mais disponível.';
    END IF;
    IF product_row.pix_key IS NULL OR trim(product_row.pix_key) = '' THEN
      RAISE EXCEPTION 'Uma loja ainda não configurou o recebimento via Pix.';
    END IF;
    IF product_row.stock < quantity_value THEN
      RAISE EXCEPTION 'Estoque insuficiente para %.', product_row.title;
    END IF;

    item_total := round(product_row.price * quantity_value, 2);
    products_total := products_total + item_total;
    item_fee := round(item_total * rate, 2);
    total_fee := total_fee + item_fee;
    total_seller := total_seller + item_total - item_fee;

    IF NOT product_row.store_id = ANY(seen_stores) THEN
      seen_stores := array_append(seen_stores, product_row.store_id);
    END IF;
    IF NOT product_row.free_shipping AND NOT product_row.store_id = ANY(stores_with_paid_shipping) THEN
      stores_with_paid_shipping := array_append(stores_with_paid_shipping, product_row.store_id);
      shipping_total := shipping_total + 19.90;
    END IF;
  END LOOP;

  INSERT INTO public.orders (
    buyer_id, total, platform_fee, seller_amount, status, payment_status,
    payment_provider, shipping_address
  ) VALUES (
    current_user_id, products_total + shipping_total, total_fee,
    total_seller + shipping_total, 'pending', 'pending', 'pix_whatsapp',
    jsonb_build_object(
      'name', trim(_shipping_address ->> 'name'),
      'phone', left(trim(COALESCE(_shipping_address ->> 'phone', '')), 20),
      'address', trim(_shipping_address ->> 'address'),
      'city', trim(_shipping_address ->> 'city'),
      'note', left(trim(COALESCE(_shipping_address ->> 'note', '')), 200),
      'shipping_total', shipping_total
    )
  ) RETURNING id INTO order_id;

  FOR current_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    product_id_value := (current_item ->> 'product_id')::uuid;
    quantity_value := (current_item ->> 'quantity')::integer;

    SELECT p.id, p.store_id, p.title, p.price
      INTO product_row
      FROM public.products p
     WHERE p.id = product_id_value;

    item_total := round(product_row.price * quantity_value, 2);
    item_fee := round(item_total * rate, 2);

    INSERT INTO public.order_items (
      order_id, product_id, store_id, title, unit_price, quantity,
      platform_fee, seller_amount, commission_rate
    ) VALUES (
      order_id, product_row.id, product_row.store_id, product_row.title,
      product_row.price, quantity_value, item_fee, item_total - item_fee, rate
    );

    UPDATE public.products
       SET stock = stock - quantity_value,
           sold_count = sold_count + quantity_value
     WHERE id = product_row.id;
  END LOOP;

  RETURN order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_marketplace_order(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(jsonb, jsonb) TO service_role;