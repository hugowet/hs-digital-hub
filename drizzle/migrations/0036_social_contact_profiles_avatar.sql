
-- Contatos passam a trazer a foto de perfil
DROP FUNCTION IF EXISTS public.social_contact_profiles();
CREATE OR REPLACE FUNCTION public.social_contact_profiles()
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id <> auth.uid()
  ORDER BY p.full_name NULLS LAST
  LIMIT 500;
$$;
GRANT EXECUTE ON FUNCTION public.social_contact_profiles() TO authenticated;
