CREATE TABLE public.mercado_pago_accounts (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  mercado_pago_user_id text NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mercado_pago_accounts TO service_role;
ALTER TABLE public.mercado_pago_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service manages mercado pago accounts"
ON public.mercado_pago_accounts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

INSERT INTO public.mercado_pago_accounts (
  store_id, mercado_pago_user_id, access_token_encrypted,
  refresh_token_encrypted, token_expires_at
)
SELECT id, mercado_pago_user_id, mercado_pago_access_token_encrypted,
       mercado_pago_refresh_token_encrypted, mercado_pago_token_expires_at
FROM public.stores
WHERE mercado_pago_user_id IS NOT NULL
  AND mercado_pago_access_token_encrypted IS NOT NULL
ON CONFLICT (store_id) DO NOTHING;

UPDATE public.stores
SET mercado_pago_access_token_encrypted = NULL,
    mercado_pago_refresh_token_encrypted = NULL,
    mercado_pago_token_expires_at = NULL
WHERE mercado_pago_access_token_encrypted IS NOT NULL
   OR mercado_pago_refresh_token_encrypted IS NOT NULL
   OR mercado_pago_token_expires_at IS NOT NULL;

CREATE TRIGGER mercado_pago_accounts_set_updated_at
BEFORE UPDATE ON public.mercado_pago_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
         sum(oi.unit_price * oi.quantity)
           + CASE WHEN bool_or(NOT p.free_shipping) THEN 19.90 ELSE 0 END,
         sum(oi.platform_fee),
         sum(oi.seller_amount)
           + CASE WHEN bool_or(NOT p.free_shipping) THEN 19.90 ELSE 0 END
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = order_id
  GROUP BY oi.store_id;

  RETURN order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_marketplace_order(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(jsonb, jsonb) TO authenticated, service_role;