DROP POLICY IF EXISTS trend_comments_auth_read ON public.trend_comments;
CREATE POLICY trend_comments_auth_read ON public.trend_comments FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'));
DROP POLICY IF EXISTS trend_likes_auth_read ON public.trend_likes;
CREATE POLICY trend_likes_auth_read ON public.trend_likes FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS trend_follows_auth_read ON public.trend_follows;
CREATE POLICY trend_follows_auth_read ON public.trend_follows FOR SELECT TO authenticated USING (follower_id = (SELECT auth.uid()) OR followed_id = (SELECT auth.uid()));
REVOKE SELECT ON public.trend_comments, public.trend_likes, public.trend_follows FROM anon;
CREATE OR REPLACE FUNCTION public.read_trend_comments(_video_id uuid)
RETURNS SETOF public.trend_comments LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login necessário.' USING ERRCODE = '42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.trend_videos WHERE id = _video_id) THEN RETURN; END IF;
 RETURN QUERY SELECT c.* FROM public.trend_comments c WHERE c.video_id = _video_id ORDER BY c.created_at DESC LIMIT 100;
END; $$;
REVOKE ALL ON FUNCTION public.read_trend_comments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_trend_comments(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.read_trend_follower_counts(_author_ids uuid[])
RETURNS TABLE (author_id uuid, follower_count bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login necessário.' USING ERRCODE = '42501'; END IF;
 IF cardinality(_author_ids) > 100 THEN RAISE EXCEPTION 'Limite de autores excedido.' USING ERRCODE = '22023'; END IF;
 RETURN QUERY SELECT f.followed_id, count(*) FROM public.trend_follows f WHERE f.followed_id = ANY(_author_ids) AND EXISTS (SELECT 1 FROM public.trend_videos v WHERE v.user_id=f.followed_id) GROUP BY f.followed_id;
END; $$;
REVOKE ALL ON FUNCTION public.read_trend_follower_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_trend_follower_counts(uuid[]) TO authenticated, service_role;