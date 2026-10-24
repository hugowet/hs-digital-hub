CREATE POLICY trend_videos_storage_read ON storage.objects FOR SELECT USING (bucket_id = 'trend-videos');
CREATE POLICY trend_videos_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trend-videos' AND (storage.foldername(name))[1] = auth.uid()::text AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_clube_hs));
CREATE POLICY trend_videos_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trend-videos' AND (storage.foldername(name))[1] = auth.uid()::text);