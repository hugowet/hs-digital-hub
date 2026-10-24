DROP POLICY trend_videos_clube_insert ON public.trend_videos;
CREATE POLICY trend_videos_clube_insert ON public.trend_videos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_clube_hs)));