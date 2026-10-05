CREATE TABLE public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0 CHECK (counter >= 0),
  device_type text NOT NULL CHECK (device_type IN ('singleDevice', 'multiDevice')),
  backed_up boolean NOT NULL DEFAULT false,
  transports text[] NOT NULL DEFAULT '{}',
  nickname text NOT NULL DEFAULT 'Meu dispositivo' CHECK (char_length(nickname) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
GRANT SELECT ON public.webauthn_credentials TO authenticated;
GRANT ALL ON public.webauthn_credentials TO service_role;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own passkeys" ON public.webauthn_credentials FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX webauthn_credentials_user_active_idx ON public.webauthn_credentials (user_id, created_at DESC) WHERE revoked_at IS NULL;

CREATE TABLE public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  challenge_type text NOT NULL CHECK (challenge_type IN ('registration', 'authentication')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.webauthn_challenges TO service_role;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX webauthn_challenges_expiry_idx ON public.webauthn_challenges (expires_at);

CREATE TABLE public.user_game_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_balance integer NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
  lifetime_coins integer NOT NULL DEFAULT 0 CHECK (lifetime_coins >= 0),
  rewarded_milestones integer NOT NULL DEFAULT 0 CHECK (rewarded_milestones >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_game_wallets TO authenticated;
GRANT ALL ON public.user_game_wallets TO service_role;
ALTER TABLE public.user_game_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers read own game wallet" ON public.user_game_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'buyer'));

CREATE TABLE public.arcade_game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('snake', 'pacman', 'flappy', 'highway')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  submitted_at timestamptz,
  submitted_coins integer,
  accepted_coins integer
);
GRANT SELECT ON public.arcade_game_sessions TO authenticated;
GRANT ALL ON public.arcade_game_sessions TO service_role;
ALTER TABLE public.arcade_game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers read own arcade sessions" ON public.arcade_game_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'buyer'));
CREATE INDEX arcade_game_sessions_user_idx ON public.arcade_game_sessions (user_id, started_at DESC);

ALTER TABLE public.user_coupons DROP CONSTRAINT user_coupons_source_check;
ALTER TABLE public.user_coupons ADD CONSTRAINT user_coupons_source_check CHECK (source IN ('wheel', 'scratch', 'arcade'));

CREATE OR REPLACE FUNCTION public.start_arcade_game(_game_type text)
RETURNS TABLE(session_id uuid, total_coins integer, hard_mode boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); sid uuid; total integer;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'buyer') OR public.has_role(uid, 'seller') THEN RAISE EXCEPTION 'Jogos disponíveis somente para compradores.'; END IF;
  IF _game_type NOT IN ('snake','pacman','flappy','highway') THEN RAISE EXCEPTION 'Jogo inválido.'; END IF;
  INSERT INTO public.user_game_wallets(user_id) VALUES(uid) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.arcade_game_sessions(user_id, game_type) VALUES(uid, _game_type) RETURNING id INTO sid;
  SELECT lifetime_coins INTO total FROM public.user_game_wallets WHERE user_id = uid;
  RETURN QUERY SELECT sid, total, total >= 500;
END; $$;
REVOKE ALL ON FUNCTION public.start_arcade_game(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_arcade_game(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.finish_arcade_game(_session_id uuid, _coins integer)
RETURNS TABLE(accepted_coins integer, total_coins integer, coupon_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); gs public.arcade_game_sessions%ROWTYPE; elapsed integer; allowed integer; accepted integer; old_total integer; new_total integer; old_milestones integer; new_milestones integer; code text;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'buyer') OR public.has_role(uid, 'seller') THEN RAISE EXCEPTION 'Jogos disponíveis somente para compradores.'; END IF;
  SELECT * INTO gs FROM public.arcade_game_sessions WHERE id = _session_id AND user_id = uid FOR UPDATE;
  IF NOT FOUND OR gs.submitted_at IS NOT NULL OR gs.expires_at < now() THEN RAISE EXCEPTION 'Partida inválida ou encerrada.'; END IF;
  elapsed := greatest(1, extract(epoch FROM (now() - gs.started_at))::integer);
  allowed := least(250, greatest(5, elapsed * CASE gs.game_type WHEN 'highway' THEN 3 ELSE 2 END));
  accepted := least(greatest(_coins, 0), allowed);
  UPDATE public.arcade_game_sessions SET submitted_at=now(), submitted_coins=_coins, accepted_coins=accepted WHERE id=gs.id;
  INSERT INTO public.user_game_wallets(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  SELECT lifetime_coins, rewarded_milestones INTO old_total, old_milestones FROM public.user_game_wallets WHERE user_id=uid FOR UPDATE;
  new_total := old_total + accepted;
  new_milestones := floor(new_total / 1000);
  UPDATE public.user_game_wallets SET coin_balance=coin_balance+accepted, lifetime_coins=new_total, rewarded_milestones=new_milestones, updated_at=now() WHERE user_id=uid;
  IF new_milestones > old_milestones THEN
    code := 'A-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    INSERT INTO public.user_coupons(user_id,source,kind,percent_off,max_discount,code,expires_at)
    VALUES(uid,'arcade','shipping_percent',10,30,code,now()+interval '24 hours');
  END IF;
  RETURN QUERY SELECT accepted, new_total, code;
END; $$;
REVOKE ALL ON FUNCTION public.finish_arcade_game(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_arcade_game(uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.play_daily_game(_game_type text)
RETURNS TABLE(outcome text, coupon_id uuid, coupon_code text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); today_brazil date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; roll double precision; selected text; cid uuid; code text; expiry timestamptz := now()+interval '24 hours';
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'buyer') OR public.has_role(uid,'seller') THEN RAISE EXCEPTION 'Jogos disponíveis somente para compradores.'; END IF;
  IF _game_type NOT IN ('wheel','scratch') THEN RAISE EXCEPTION 'Jogo inválido.'; END IF;
  IF EXISTS(SELECT 1 FROM public.game_plays WHERE user_id=uid AND game_type=_game_type AND played_on=today_brazil) THEN RAISE EXCEPTION 'Você já jogou hoje. Volte amanhã para tentar novamente.'; END IF;
  roll := random();
  selected := CASE WHEN roll<0.12 THEN 'free_shipping' WHEN roll<0.28 THEN 'shipping_10' WHEN roll<0.58 THEN 'shipping_5' ELSE 'none' END;
  IF selected='free_shipping' AND EXISTS(SELECT 1 FROM public.user_coupons WHERE user_id=uid AND kind='free_shipping' AND created_at>=date_trunc('month',now())) THEN selected := CASE WHEN random()<0.55 THEN 'shipping_10' ELSE 'shipping_5' END; END IF;
  INSERT INTO public.game_plays(user_id,game_type,played_on,outcome) VALUES(uid,_game_type,today_brazil,selected);
  IF selected<>'none' THEN
    code := upper(substr(_game_type,1,1))||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    INSERT INTO public.user_coupons(user_id,source,kind,percent_off,max_discount,code,expires_at) VALUES(uid,_game_type,CASE WHEN selected='free_shipping' THEN 'free_shipping' ELSE 'shipping_percent' END,CASE WHEN selected='shipping_5' THEN 5 WHEN selected='shipping_10' THEN 10 ELSE NULL END,30,code,expiry) RETURNING id INTO cid;
  END IF;
  RETURN QUERY SELECT selected,cid,code,CASE WHEN cid IS NULL THEN NULL ELSE expiry END;
END; $$;
REVOKE ALL ON FUNCTION public.play_daily_game(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.play_daily_game(text) TO authenticated, service_role;