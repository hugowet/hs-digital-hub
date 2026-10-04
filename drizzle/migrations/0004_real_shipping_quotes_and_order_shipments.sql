ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_kg numeric(8,3),
  ADD COLUMN IF NOT EXISTS height_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS width_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS length_cm numeric(8,2);

ALTER TABLE public.products
  ADD CONSTRAINT products_shipping_dimensions_check CHECK (
    (weight_kg IS NULL OR weight_kg > 0) AND
    (height_cm IS NULL OR height_cm > 0) AND
    (width_cm IS NULL OR width_cm > 0) AND
    (length_cm IS NULL OR length_cm > 0)
  );

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS origin_postal_code text;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_origin_postal_code_check CHECK (
    origin_postal_code IS NULL OR origin_postal_code ~ '^[0-9]{8}$'
  );

CREATE TABLE public.shipping_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('cj', 'melhor_envio')),
  service_code text NOT NULL,
  service_name text NOT NULL,
  carrier_name text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  delivery_days_min integer CHECK (delivery_days_min IS NULL OR delivery_days_min >= 0),
  delivery_days_max integer CHECK (delivery_days_max IS NULL OR delivery_days_max >= delivery_days_min),
  destination_postal_code text NOT NULL CHECK (destination_postal_code ~ '^[0-9]{8}$'),
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_quotes TO authenticated;
GRANT ALL ON public.shipping_quotes TO service_role;
ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyers read own shipping quotes"
ON public.shipping_quotes FOR SELECT TO authenticated
USING (buyer_id = auth.uid());
CREATE INDEX shipping_quotes_buyer_expiry_idx
ON public.shipping_quotes(buyer_id, expires_at DESC);

CREATE TABLE public.order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.shipping_quotes(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('cj', 'melhor_envio')),
  service_code text NOT NULL,
  service_name text NOT NULL,
  carrier_name text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  delivery_days_min integer,
  delivery_days_max integer,
  destination_postal_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, store_id)
);
GRANT SELECT ON public.order_shipments TO authenticated;
GRANT ALL ON public.order_shipments TO service_role;
ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyers read own order shipments"
ON public.order_shipments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_shipments.order_id AND o.buyer_id = auth.uid()));
CREATE POLICY "store owners read own order shipments"
ON public.order_shipments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = order_shipments.store_id AND s.owner_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.create_marketplace_order_v2(
  _items jsonb,
  _shipping_address jsonb,
  _shipping_quote_ids jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_item jsonb;
  product_row record;
  quote_row public.shipping_quotes%ROWTYPE;
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
  physical_stores uuid[] := ARRAY[]::uuid[];
  current_store_id uuid;
  quote_id_value uuid;
  expected_items jsonb;
  destination_zip text := regexp_replace(COALESCE(_shipping_address ->> 'postal_code', ''), '[^0-9]', '', 'g');
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
     OR char_length(trim(COALESCE(_shipping_address ->> 'city', ''))) NOT BETWEEN 2 AND 100
     OR char_length(destination_zip) <> 8 THEN
    RAISE EXCEPTION 'Preencha corretamente os dados de entrega, incluindo o CEP.';
  END IF;
  IF jsonb_typeof(COALESCE(_shipping_quote_ids, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Seleção de frete inválida.';
  END IF;

  SELECT commission_rate INTO rate FROM public.platform_settings WHERE id = true;
  rate := COALESCE(rate, 0.1200);

  FOR current_item IN SELECT value FROM jsonb_array_elements(_items) ORDER BY value ->> 'product_id' LOOP
    BEGIN
      product_id_value := (current_item ->> 'product_id')::uuid;
      quantity_value := (current_item ->> 'quantity')::integer;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Produto ou quantidade inválida.';
    END;
    IF quantity_value < 1 OR quantity_value > 99 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    IF product_id_value = ANY(seen_products) THEN RAISE EXCEPTION 'Produto duplicado.'; END IF;
    seen_products := array_append(seen_products, product_id_value);

    SELECT p.id, p.store_id, p.title, p.price, p.stock, p.product_type, p.is_active,
           s.status, s.mercado_pago_status
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
    IF product_row.product_type <> 'digital' AND NOT product_row.store_id = ANY(physical_stores) THEN
      physical_stores := array_append(physical_stores, product_row.store_id);
    END IF;
  END LOOP;

  FOREACH current_store_id IN ARRAY physical_stores LOOP
    BEGIN
      quote_id_value := (_shipping_quote_ids ->> current_store_id::text)::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Escolha uma opção de frete válida para cada loja.';
    END;
    SELECT * INTO quote_row FROM public.shipping_quotes
    WHERE id = quote_id_value AND buyer_id = current_user_id AND store_id = current_store_id
      AND destination_postal_code = destination_zip AND expires_at > now()
      AND consumed_order_id IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A cotação de frete expirou. Calcule novamente.'; END IF;

    SELECT jsonb_agg(jsonb_build_object('product_id', product_id::text, 'quantity', quantity) ORDER BY product_id::text)
    INTO expected_items
    FROM (
      SELECT (value ->> 'product_id')::uuid AS product_id, (value ->> 'quantity')::integer AS quantity
      FROM jsonb_array_elements(_items)
    ) requested
    JOIN public.products p ON p.id = requested.product_id
    WHERE p.store_id = current_store_id AND p.product_type <> 'digital';
    IF quote_row.items <> expected_items THEN
      RAISE EXCEPTION 'Os itens mudaram. Calcule o frete novamente.';
    END IF;
    shipping_total := shipping_total + quote_row.amount;
  END LOOP;

  INSERT INTO public.orders (buyer_id, total, platform_fee, seller_amount, status, payment_status, payment_provider, shipping_address)
  VALUES (
    current_user_id, products_total + shipping_total, total_fee, total_seller + shipping_total,
    'awaiting_payment', 'pending', 'mercadopago',
    jsonb_build_object(
      'name', trim(_shipping_address ->> 'name'),
      'phone', left(trim(COALESCE(_shipping_address ->> 'phone', '')), 20),
      'address', trim(_shipping_address ->> 'address'),
      'city', trim(_shipping_address ->> 'city'),
      'state', left(trim(COALESCE(_shipping_address ->> 'state', '')), 2),
      'postal_code', destination_zip,
      'note', left(trim(COALESCE(_shipping_address ->> 'note', '')), 200),
      'shipping_total', shipping_total
    )
  ) RETURNING id INTO v_order_id;

  FOR current_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    product_id_value := (current_item ->> 'product_id')::uuid;
    quantity_value := (current_item ->> 'quantity')::integer;
    SELECT p.id, p.store_id, p.title, p.price INTO product_row FROM public.products p WHERE p.id = product_id_value;
    item_total := round(product_row.price * quantity_value, 2);
    item_fee := round(item_total * rate, 2);
    INSERT INTO public.order_items (order_id, product_id, store_id, title, unit_price, quantity, platform_fee, seller_amount, commission_rate)
    VALUES (v_order_id, product_row.id, product_row.store_id, product_row.title, product_row.price, quantity_value, item_fee, item_total - item_fee, rate);
    UPDATE public.products SET stock = stock - quantity_value WHERE id = product_row.id;
  END LOOP;

  FOREACH current_store_id IN ARRAY physical_stores LOOP
    quote_id_value := (_shipping_quote_ids ->> current_store_id::text)::uuid;
    SELECT * INTO quote_row FROM public.shipping_quotes WHERE id = quote_id_value;
    INSERT INTO public.order_shipments (
      order_id, store_id, quote_id, provider, service_code, service_name, carrier_name,
      amount, delivery_days_min, delivery_days_max, destination_postal_code
    ) VALUES (
      v_order_id, current_store_id, quote_row.id, quote_row.provider, quote_row.service_code,
      quote_row.service_name, quote_row.carrier_name, quote_row.amount,
      quote_row.delivery_days_min, quote_row.delivery_days_max, quote_row.destination_postal_code
    );
    UPDATE public.shipping_quotes SET consumed_order_id = v_order_id WHERE id = quote_row.id;
  END LOOP;

  INSERT INTO public.payment_transactions (order_id, store_id, buyer_id, gross_amount, platform_fee, seller_amount)
  SELECT v_order_id, oi.store_id, current_user_id,
         sum(oi.unit_price * oi.quantity) + COALESCE(os.amount, 0),
         sum(oi.platform_fee),
         sum(oi.seller_amount) + COALESCE(os.amount, 0)
  FROM public.order_items oi
  LEFT JOIN public.order_shipments os ON os.order_id = v_order_id AND os.store_id = oi.store_id
  WHERE oi.order_id = v_order_id
  GROUP BY oi.store_id, os.amount;

  RETURN v_order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_marketplace_order_v2(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order_v2(jsonb, jsonb, jsonb) TO authenticated, service_role;
COMMENT ON FUNCTION public.create_marketplace_order(jsonb, jsonb) IS 'DEPRECATED: replaced by create_marketplace_order_v2 with server-validated shipping quotes.';