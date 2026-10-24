DROP POLICY trend_videos_storage_insert ON storage.objects;
CREATE POLICY trend_videos_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trend-videos' AND (storage.foldername(name))[1] = auth.uid()::text AND (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_clube_hs)));