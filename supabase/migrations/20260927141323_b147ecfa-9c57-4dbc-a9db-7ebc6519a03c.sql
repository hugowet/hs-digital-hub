DROP POLICY IF EXISTS "settings are public" ON public.platform_settings;

CREATE POLICY "public reads active platform settings"
ON public.platform_settings
FOR SELECT
TO public
USING (id IS TRUE);