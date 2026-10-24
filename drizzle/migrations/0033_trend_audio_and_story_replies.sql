ALTER TABLE public.trend_videos ADD COLUMN audio_path text;

CREATE OR REPLACE FUNCTION public.social_open_by_user(_user_id uuid)
RETURNS TABLE(conversation_id uuid, profile_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
  _a uuid;
  _b uuid;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _user_id IS NULL OR _user_id = _me THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;
  _a := LEAST(_me, _user_id);
  _b := GREATEST(_me, _user_id);
  SELECT id INTO _conv FROM public.social_conversations WHERE member_a = _a AND member_b = _b;
  IF _conv IS NULL THEN
    INSERT INTO public.social_conversations (member_a, member_b) VALUES (_a, _b) RETURNING id INTO _conv;
  END IF;
  RETURN QUERY
    SELECT _conv, p.id, p.full_name FROM public.profiles p WHERE p.id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.social_open_by_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_open_by_user(uuid) TO authenticated;