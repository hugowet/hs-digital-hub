CREATE OR REPLACE FUNCTION public.admin_marketing_contacts()
RETURNS TABLE(id uuid, full_name text, email text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id, COALESCE(NULLIF(p.full_name, ''), split_part(u.email, '@', 1))::text, u.email::text, u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email IS NOT NULL AND u.deleted_at IS NULL
  ORDER BY u.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_marketing_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_marketing_contacts() TO authenticated;