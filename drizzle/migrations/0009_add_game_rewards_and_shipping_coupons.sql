CREATE TABLE public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('wheel', 'scratch')),
  played_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  outcome text NOT NULL CHECK (outcome IN ('shipping_5', 'shipping_10', 'free_shipping', 'none')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_type, played_on)
);
GRANT SELECT ON public.game_plays TO authenticated;
GRANT ALL ON public.game_plays TO service_role;
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own game plays" ON public.game_plays FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('wheel', 'scratch')),
  kind text NOT NULL CHECK (kind IN ('shipping_percent', 'free_shipping')),
  percent_off numeric(5,2),
  max_discount numeric(10,2) NOT NULL DEFAULT 30.00 CHECK (max_discount > 0 AND max_discount <= 30.00),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),
  expires_at timestamptz NOT NULL,
  redeemed_order_id uuid REFERENCES public.orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'shipping_percent' AND percent_off IN (5, 10)) OR (kind = 'free_shipping' AND percent_off IS NULL))
);
GRANT SELECT ON public.user_coupons TO authenticated;
GRANT ALL ON public.user_coupons TO service_role;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own coupons" ON public.user_coupons FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX user_coupons_active_idx ON public.user_coupons (user_id, status, expires_at DESC);

ALTER TABLE public.orders ADD COLUMN coupon_discount numeric(10,2) NOT NULL DEFAULT 0 CHECK (coupon_discount >= 0);

CREATE OR REPLACE FUNCTION public.play_daily_game(_game_type text)
RETURNS TABLE(outcome text, coupon_id uuid, coupon_code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  today_brazil date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  roll double precision;
  selected_outcome text;
  new_coupon_id uuid;
  new_coupon_code text;
  new_expires_at timestamptz := now() + interval '24 hours';
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para jogar.'; END IF;
  IF _game_type NOT IN ('wheel', 'scratch') THEN RAISE EXCEPTION 'Jogo inválido.'; END IF;
  IF EXISTS (SELECT 1 FROM public.game_plays gp WHERE gp.user_id = current_user_id AND gp.game_type = _game_type AND gp.played_on = today_brazil) THEN
    RAISE EXCEPTION 'Você já jogou hoje. Volte amanhã para tentar novamente.';
  END IF;

  roll := random();
  selected_outcome := CASE
    WHEN roll < 0.12 THEN 'free_shipping'
    WHEN roll < 0.28 THEN 'shipping_10'
    WHEN roll < 0.58 THEN 'shipping_5'
    ELSE 'none'
  END;

  INSERT INTO public.game_plays (user_id, game_type, played_on, outcome)
  VALUES (current_user_id, _game_type, today_brazil, selected_outcome);

  IF selected_outcome <> 'none' THEN
    new_coupon_code := upper(substr(_game_type, 1, 1)) || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    INSERT INTO public.user_coupons (user_id, source, kind, percent_off, max_discount, code, expires_at)
    VALUES (
      current_user_id,
      _game_type,
      CASE WHEN selected_outcome = 'free_shipping' THEN 'free_shipping' ELSE 'shipping_percent' END,
      CASE WHEN selected_outcome = 'shipping_5' THEN 5 WHEN selected_outcome = 'shipping_10' THEN 10 ELSE NULL END,
      30,
      new_coupon_code,
      new_expires_at
    ) RETURNING id INTO new_coupon_id;
  END IF;

  RETURN QUERY SELECT selected_outcome, new_coupon_id, new_coupon_code, CASE WHEN new_coupon_id IS NULL THEN NULL ELSE new_expires_at END;
END;
$$;
REVOKE ALL ON FUNCTION public.play_daily_game(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.play_daily_game(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_marketplace_order_v3(_items jsonb, _shipping_address jsonb, _shipping_quote_ids jsonb, _coupon_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  v_order_id uuid;
  coupon_row public.user_coupons%ROWTYPE;
  shipping_total numeric(12,2);
  requested_discount numeric(12,2) := 0;
  applied_discount numeric(12,2) := 0;
  remaining_discount numeric(12,2) := 0;
  tx_row record;
  tx_discount numeric(12,2);
BEGIN
  v_order_id := public.create_marketplace_order_v2(_items, _shipping_address, _shipping_quote_ids);
  IF _coupon_id IS NULL THEN RETURN v_order_id; END IF;

  SELECT * INTO coupon_row FROM public.user_coupons
  WHERE id = _coupon_id AND user_id = current_user_id AND status = 'active' AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Este cupom não está disponível ou expirou.'; END IF;

  SELECT COALESCE(sum(amount), 0) INTO shipping_total FROM public.order_shipments WHERE order_id = v_order_id;
  IF shipping_total <= 0 THEN RAISE EXCEPTION 'Este cupom é válido somente para pedidos com frete.'; END IF;

  requested_discount := CASE
    WHEN coupon_row.kind = 'free_shipping' THEN LEAST(shipping_total, coupon_row.max_discount)
    ELSE LEAST(round(shipping_total * coupon_row.percent_off / 100, 2), coupon_row.max_discount)
  END;
  remaining_discount := requested_discount;

  FOR tx_row IN
    SELECT pt.id, pt.platform_fee, os.amount AS shipping_amount
    FROM public.payment_transactions pt
    JOIN public.order_shipments os ON os.order_id = pt.order_id AND os.store_id = pt.store_id
    WHERE pt.order_id = v_order_id
    ORDER BY os.amount DESC, pt.id
    FOR UPDATE OF pt
  LOOP
    EXIT WHEN remaining_discount <= 0;
    tx_discount := LEAST(remaining_discount, tx_row.platform_fee, tx_row.shipping_amount);
    IF tx_discount > 0 THEN
      UPDATE public.payment_transactions
      SET gross_amount = gross_amount - tx_discount,
          platform_fee = platform_fee - tx_discount
      WHERE id = tx_row.id;
      applied_discount := applied_discount + tx_discount;
      remaining_discount := remaining_discount - tx_discount;
    END IF;
  END LOOP;

  IF applied_discount <= 0 THEN RAISE EXCEPTION 'O cupom não pôde ser aplicado a este pedido.'; END IF;

  UPDATE public.orders
  SET total = total - applied_discount,
      platform_fee = platform_fee - applied_discount,
      coupon_discount = applied_discount,
      shipping_address = shipping_address || jsonb_build_object('coupon_code', coupon_row.code, 'coupon_discount', applied_discount)
  WHERE id = v_order_id;

  UPDATE public.user_coupons
  SET status = 'redeemed', redeemed_order_id = v_order_id
  WHERE id = coupon_row.id;

  RETURN v_order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_marketplace_order_v3(jsonb, jsonb, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order_v3(jsonb, jsonb, jsonb, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.create_marketplace_order_v2(jsonb, jsonb, jsonb) IS 'DEPRECATED: shopper checkout uses v3 for atomic shipping coupon redemption.';