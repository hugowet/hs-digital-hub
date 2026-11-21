ALTER TABLE public.site_page_views ADD COLUMN country_code text, ADD COLUMN city text, ADD COLUMN region text, ADD COLUMN device_type text CHECK (device_type IN ('mobile','desktop','tablet','unknown'));
CREATE OR REPLACE FUNCTION public.record_page_view_details(_path text, _session text, _user_id uuid, _country text, _city text, _region text, _device text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing_id bigint;
BEGIN
  IF _path IS NULL OR length(_path)>200 OR left(_path,1)<>'/' OR left(_path,2)='//' THEN RETURN; END IF;
  IF _session IS NULL OR length(_session)<8 OR length(_session)>64 THEN RETURN; END IF;
  IF _device NOT IN ('mobile','desktop','tablet','unknown') THEN RETURN; END IF;
  IF (_country IS NOT NULL AND _country !~ '^[A-Z]{2}$') OR length(_city)>120 OR length(_region)>120 THEN RETURN; END IF;
  SELECT id INTO existing_id FROM public.site_page_views WHERE session_id=_session AND path=_path AND user_id IS NOT DISTINCT FROM _user_id AND created_at>now()-interval '30 minutes' ORDER BY created_at DESC LIMIT 1;
  IF existing_id IS NOT NULL THEN
    UPDATE public.site_page_views SET country_code=coalesce(country_code,_country),city=coalesce(city,_city),region=coalesce(region,_region),device_type=coalesce(device_type,_device) WHERE id=existing_id;
    RETURN;
  END IF;
  IF (SELECT count(*) FROM public.site_page_views WHERE session_id=_session AND created_at>now()-interval '1 hour')>=300 THEN RETURN; END IF;
  INSERT INTO public.site_page_views(path,session_id,user_id,country_code,city,region,device_type) VALUES (_path,_session,_user_id,_country,_city,_region,_device);
END; $$;
REVOKE ALL ON FUNCTION public.record_page_view_details(text,text,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_page_view_details(text,text,uuid,text,text,text,text) TO service_role;