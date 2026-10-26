CREATE OR REPLACE FUNCTION public.reserve_cj_identified_free_translation(_bytes integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE consumed integer;
BEGIN
  IF _bytes IS NULL OR _bytes < 1 OR _bytes > 500 THEN RETURN false; END IF;
  INSERT INTO public.cj_translation_daily_usage(day, used_bytes)
  VALUES ((now() AT TIME ZONE 'UTC')::date, _bytes)
  ON CONFLICT (day) DO UPDATE
  SET used_bytes = cj_translation_daily_usage.used_bytes + EXCLUDED.used_bytes
  WHERE cj_translation_daily_usage.used_bytes + EXCLUDED.used_bytes <= 45000
  RETURNING used_bytes INTO consumed;
  RETURN consumed IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_cj_identified_free_translation(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_cj_identified_free_translation(integer) TO service_role;
COMMENT ON FUNCTION public.reserve_cj_identified_free_translation(integer) IS 'Server-only MyMemory requests with an authorized valid de contact: conservative 45000 UTF-8 bytes/day beneath the documented 50000 chars/day allowance. Shared with existing anonymous usage; old RPC retains its 4000-byte cap for deployed clients. No paid fallback.';