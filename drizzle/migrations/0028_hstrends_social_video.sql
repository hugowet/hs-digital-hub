ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_text text;

CREATE TABLE public.trend_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_avatar text,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  post_type text NOT NULL DEFAULT 'organic',
  music_title text NOT NULL DEFAULT 'Som Original',
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trend_videos TO anon;
GRANT SELECT, INSERT, DELETE ON public.trend_videos TO authenticated;
GRANT ALL ON public.trend_videos TO service_role;
ALTER TABLE public.trend_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY trend_videos_public_read ON public.trend_videos FOR SELECT USING (true);
CREATE POLICY trend_videos_clube_insert ON public.trend_videos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_clube_hs));
CREATE POLICY trend_videos_owner_delete ON public.trend_videos FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.trend_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.trend_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_avatar text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trend_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.trend_comments TO authenticated;
GRANT ALL ON public.trend_comments TO service_role;
ALTER TABLE public.trend_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY trend_comments_public_read ON public.trend_comments FOR SELECT USING (true);
CREATE POLICY trend_comments_auth_insert ON public.trend_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY trend_comments_owner_delete ON public.trend_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.trend_likes (
  video_id uuid NOT NULL REFERENCES public.trend_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
GRANT SELECT ON public.trend_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.trend_likes TO authenticated;
GRANT ALL ON public.trend_likes TO service_role;
ALTER TABLE public.trend_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY trend_likes_public_read ON public.trend_likes FOR SELECT USING (true);
CREATE POLICY trend_likes_auth_insert ON public.trend_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY trend_likes_owner_delete ON public.trend_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.trend_sync_like_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.trend_videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.trend_videos SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trend_likes_count AFTER INSERT OR DELETE ON public.trend_likes
  FOR EACH ROW EXECUTE FUNCTION public.trend_sync_like_count();

CREATE TABLE public.trend_follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
GRANT SELECT ON public.trend_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.trend_follows TO authenticated;
GRANT ALL ON public.trend_follows TO service_role;
ALTER TABLE public.trend_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY trend_follows_public_read ON public.trend_follows FOR SELECT USING (true);
CREATE POLICY trend_follows_auth_insert ON public.trend_follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY trend_follows_owner_delete ON public.trend_follows FOR DELETE TO authenticated USING (follower_id = auth.uid());