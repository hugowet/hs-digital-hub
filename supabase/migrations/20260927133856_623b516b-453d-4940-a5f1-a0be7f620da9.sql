ALTER TABLE public.stores
  ADD COLUMN mercado_pago_user_id text,
  ADD COLUMN mercado_pago_status text NOT NULL DEFAULT 'disconnected',
  ADD COLUMN mercado_pago_access_token_encrypted text,
  ADD COLUMN mercado_pago_refresh_token_encrypted text,
  ADD COLUMN mercado_pago_token_expires_at timestamptz;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_mercado_pago_status_check CHECK (
    mercado_pago_status IN ('disconnected', 'pending', 'connected', 'error')
  );

ALTER TABLE public.orders
  ADD COLUMN checkout_group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes');

CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  buyer_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_payment_id text,
  provider_preference_id text,
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  gross_amount numeric(12,2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee numeric(12,2) NOT NULL CHECK (platform_fee >= 0),
  seller_amount numeric(12,2) NOT NULL CHECK (seller_amount >= 0),
  currency text NOT NULL DEFAULT 'BRL',
  checkout_url text,
  paid_at timestamptz,
  failure_reason text,
  provider_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, store_id),
  UNIQUE (provider, provider_payment_id)
);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer reads own payment transactions"
ON public.payment_transactions FOR SELECT TO authenticated
USING (buyer_id = auth.uid());
CREATE POLICY "seller reads store payment transactions"
ON public.payment_transactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stores s
  WHERE s.id = payment_transactions.store_id AND s.owner_id = auth.uid()
));
CREATE POLICY "admin reads all payment transactions"
ON public.payment_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_event_id text NOT NULL,
  provider_payment_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER payment_transactions_set_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.app_role;
BEGIN
  requested_role := CASE
    WHEN lower(NEW.email) = 'hugoet373@gmail.com' THEN 'admin'::public.app_role
    WHEN NEW.raw_user_meta_data ->> 'account_type' = 'seller' THEN 'seller'::public.app_role
    ELSE 'buyer'::public.app_role
  END;

  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), ''),
    CASE WHEN requested_role = 'admin' THEN 'buyer'::public.app_role ELSE requested_role END
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      account_type = EXCLUDED.account_type;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "read product images" ON storage.objects;
CREATE POLICY "owners read product images" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

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
  stores_with_paid_shipping uuid[] := ARRAY[]::uuid[];
BEGIN
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

  FOR current_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    BEGIN
      product_id_value := (current_item ->> 'product_id')::uuid;
      quantity_value := (current_item ->> 'quantity')::integer;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Produto ou quantidade inválida.';
    END;
    IF quantity_value < 1 OR quantity_value > 99 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    IF product_id_value = ANY(seen_products) THEN RAISE EXCEPTION 'Produto duplicado.'; END IF;
    seen_products := array_append(seen_products, product_id_value);

    SELECT p.id, p.store_id, p.title, p.price, p.stock, p.free_shipping,
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
    total_seller + shipping_total, 'awaiting_payment', 'pending', 'mercadopago',
    jsonb_build_object(
      'name', trim(_shipping_address ->> 'name'),
      'phone', left(trim(COALESCE(_shipping_address ->> 'phone', '')), 20),
      'address', trim(_shipping_address ->> 'address'),
      'city', trim(_shipping_address ->> 'city'),
      'note', left(trim(COALESCE(_shipping_address ->> 'note', '')), 200),
      'shipping_total', shipping_total
    )
  ) RETURNING id INTO order_id;

  FOR current_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    product_id_value := (current_item ->> 'product_id')::uuid;
    quantity_value := (current_item ->> 'quantity')::integer;
    SELECT p.id, p.store_id, p.title, p.price INTO product_row FROM public.products p WHERE p.id = product_id_value;
    item_total := round(product_row.price * quantity_value, 2);
    item_fee := round(item_total * rate, 2);
    INSERT INTO public.order_items (
      order_id, product_id, store_id, title, unit_price, quantity,
      platform_fee, seller_amount, commission_rate
    ) VALUES (
      order_id, product_row.id, product_row.store_id, product_row.title,
      product_row.price, quantity_value, item_fee, item_total - item_fee, rate
    );
    UPDATE public.products SET stock = stock - quantity_value WHERE id = product_row.id;
  END LOOP;

  INSERT INTO public.payment_transactions (
    order_id, store_id, buyer_id, gross_amount, platform_fee, seller_amount
  )
  SELECT order_id, oi.store_id, current_user_id,
         sum(oi.unit_price * oi.quantity), sum(oi.platform_fee), sum(oi.seller_amount)
  FROM public.order_items oi WHERE oi.order_id = order_id GROUP BY oi.store_id;

  RETURN order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_marketplace_order(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(jsonb, jsonb) TO authenticated, service_role;