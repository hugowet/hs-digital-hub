CREATE OR REPLACE FUNCTION public.guard_social_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind IN('image','audio') AND (NEW.media_path IS NULL OR split_part(NEW.media_path,'/',1)<>NEW.sender_id::text OR NEW.media_path LIKE '%..%') THEN
    RAISE EXCEPTION 'Mídia não pertence ao remetente.';
  END IF;
  RETURN NEW;
END $$;
DROP POLICY IF EXISTS social_audio_upload_club_only ON storage.objects;
DROP POLICY IF EXISTS trend_storage_active_club ON storage.objects;
DROP POLICY IF EXISTS trend_upload_active_club ON public.trend_videos;
DROP POLICY IF EXISTS social_chat_audio_upload ON storage.objects;
CREATE POLICY social_chat_audio_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social-stories' AND (storage.foldername(name))[1] = auth.uid()::text AND lower(storage.extension(name)) = ANY (ARRAY['webm','ogg','m4a','mp3','wav']));
DROP POLICY IF EXISTS trend_videos_storage_insert ON storage.objects;
CREATE POLICY trend_videos_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trend-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS trend_videos_clube_insert ON public.trend_videos;
CREATE POLICY trend_videos_clube_insert ON public.trend_videos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());