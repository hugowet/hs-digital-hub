
-- Visualizações reais: uma por usuário por vídeo
CREATE TABLE public.trend_views (
  video_id uuid NOT NULL REFERENCES public.trend_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
GRANT SELECT, INSERT ON public.trend_views TO authenticated;
GRANT ALL ON public.trend_views TO service_role;
ALTER TABLE public.trend_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY trend_views_insert_own ON public.trend_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY trend_views_read ON public.trend_views FOR SELECT TO authenticated USING (true);

ALTER TABLE public.trend_videos ADD COLUMN views_count integer NOT NULL DEFAULT 0;

-- Registra visualização de forma atômica (uma por usuário)
CREATE OR REPLACE FUNCTION public.trend_register_view(_video_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  INSERT INTO public.trend_views (video_id, user_id)
  VALUES (_video_id, auth.uid())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    UPDATE public.trend_videos SET views_count = views_count + 1 WHERE id = _video_id;
  END IF;
  SELECT views_count INTO _count FROM public.trend_videos WHERE id = _video_id;
  RETURN COALESCE(_count, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.trend_register_view(uuid) TO authenticated;

-- Dono (ou admin) pode editar e apagar o próprio post
CREATE POLICY trend_videos_update_own ON public.trend_videos FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY trend_videos_delete_own ON public.trend_videos FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Comentários: resposta (parent_id), editar e apagar o próprio
ALTER TABLE public.trend_comments ADD COLUMN parent_id uuid REFERENCES public.trend_comments(id) ON DELETE CASCADE;
ALTER TABLE public.trend_comments ADD COLUMN edited_at timestamptz;
CREATE POLICY trend_comments_update_own ON public.trend_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY trend_comments_delete_own ON public.trend_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
