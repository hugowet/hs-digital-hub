ALTER TABLE public.trend_videos ADD COLUMN is_published boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.trend_videos.is_published IS 'Publication visibility: existing posts remain published; unpublished posts are readable only by their author.';

ALTER POLICY trend_videos_public_read ON public.trend_videos
  TO anon, authenticated
  USING (is_published OR user_id = (SELECT auth.uid()));

ALTER POLICY trend_videos_storage_read ON storage.objects
  TO authenticated
  USING (
    bucket_id = 'trend-videos'
    AND (
      owner_id = (SELECT auth.uid()::text)
      OR EXISTS (
        SELECT 1 FROM public.trend_videos v
        WHERE v.is_published
          AND split_part(objects.name, '/', 1) = v.user_id::text
          AND (v.video_url = objects.name OR v.audio_path = objects.name)
      )
    )
  );