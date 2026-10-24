DROP POLICY trend_follows_public_read ON public.trend_follows;
CREATE POLICY trend_follows_auth_read ON public.trend_follows FOR SELECT TO authenticated USING (true);

DROP POLICY trend_likes_public_read ON public.trend_likes;
CREATE POLICY trend_likes_auth_read ON public.trend_likes FOR SELECT TO authenticated USING (true);

DROP POLICY trend_comments_public_read ON public.trend_comments;
CREATE POLICY trend_comments_auth_read ON public.trend_comments FOR SELECT TO authenticated USING (true);