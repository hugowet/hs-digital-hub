CREATE TABLE public.social_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_a uuid NOT NULL REFERENCES public.profiles(id), member_b uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), CHECK(member_a<member_b), UNIQUE(member_a,member_b)
);
GRANT SELECT ON public.social_conversations TO authenticated;
GRANT ALL ON public.social_conversations TO service_role;
ALTER TABLE public.social_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_conversation_read ON public.social_conversations FOR SELECT TO authenticated USING(auth.uid() IN(member_a,member_b));
CREATE TABLE public.social_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.social_conversations(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES public.profiles(id), content text NOT NULL CHECK(char_length(trim(content)) BETWEEN 1 AND 4000), created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
GRANT SELECT,INSERT ON public.social_messages TO authenticated;
GRANT ALL ON public.social_messages TO service_role;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_message_read ON public.social_messages FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.social_conversations c WHERE c.id=conversation_id AND auth.uid() IN(c.member_a,c.member_b)));
CREATE POLICY social_message_send ON public.social_messages FOR INSERT TO authenticated WITH CHECK(sender_id=auth.uid() AND EXISTS(SELECT 1 FROM public.social_conversations c WHERE c.id=conversation_id AND auth.uid() IN(c.member_a,c.member_b)));
CREATE INDEX social_messages_conversation_time ON public.social_messages(conversation_id,created_at DESC);
CREATE TABLE public.social_stories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id), caption text NOT NULL DEFAULT '' CHECK(char_length(caption)<=500), media_path text, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT (now()+interval '24 hours'), CHECK(trim(caption)<>'' OR media_path IS NOT NULL)
);
GRANT SELECT,DELETE ON public.social_stories TO authenticated;
GRANT ALL ON public.social_stories TO service_role;
ALTER TABLE public.social_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_story_read ON public.social_stories FOR SELECT TO authenticated USING(expires_at>now() AND (user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.social_conversations c WHERE auth.uid() IN(c.member_a,c.member_b) AND user_id IN(c.member_a,c.member_b))));
CREATE POLICY social_story_delete ON public.social_stories FOR DELETE TO authenticated USING(user_id=auth.uid());
CREATE INDEX social_stories_expiry ON public.social_stories(expires_at);
CREATE OR REPLACE FUNCTION public.social_normalize_phone(_phone text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN length(n) IN(10,11) THEN '55'||n WHEN length(n) IN(12,13) AND left(n,2)='55' THEN n ELSE NULL END FROM (SELECT regexp_replace(COALESCE(_phone,''),'[^0-9]','','g') n) s $$;
CREATE INDEX profiles_social_phone ON public.profiles(public.social_normalize_phone(phone));
CREATE OR REPLACE FUNCTION public.social_open_by_phone(_phone text) RETURNS TABLE(conversation_id uuid,profile_id uuid,full_name text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE caller uuid:=auth.uid(); target uuid; own_phone text; n text:=public.social_normalize_phone(_phone); matches integer; room uuid;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 SELECT public.social_normalize_phone(p.phone) INTO own_phone FROM public.profiles p WHERE p.id=caller;
 IF own_phone IS NULL THEN RAISE EXCEPTION 'Cadastre seu telefone em Minha conta antes de conversar.'; END IF;
 IF n IS NULL THEN RAISE EXCEPTION 'Informe o número com DDD.'; END IF;
 SELECT count(*) INTO matches FROM public.profiles p WHERE public.social_normalize_phone(p.phone)=n;
 IF matches>1 THEN RAISE EXCEPTION 'Este número está associado a mais de uma conta. O titular precisa corrigir o cadastro.'; END IF;
 SELECT p.id INTO target FROM public.profiles p WHERE public.social_normalize_phone(p.phone)=n;
 IF target IS NULL THEN RAISE EXCEPTION 'Nenhum perfil encontrado com esse número.'; END IF;
 IF target=caller THEN RAISE EXCEPTION 'Este é o número da sua própria conta.'; END IF;
 INSERT INTO public.social_conversations(member_a,member_b) VALUES(LEAST(caller,target),GREATEST(caller,target)) ON CONFLICT(member_a,member_b) DO UPDATE SET member_a=excluded.member_a RETURNING id INTO room;
 RETURN QUERY SELECT room,p.id,p.full_name FROM public.profiles p WHERE p.id=target;
END; $$;
CREATE OR REPLACE FUNCTION public.social_contact_profiles() RETURNS TABLE(id uuid,full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,p.full_name FROM public.profiles p WHERE auth.uid() IS NOT NULL AND (p.id=auth.uid() OR EXISTS(SELECT 1 FROM public.social_conversations c WHERE auth.uid() IN(c.member_a,c.member_b) AND p.id IN(c.member_a,c.member_b))) $$;
CREATE OR REPLACE FUNCTION public.social_publish_story(_caption text,_media_path text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE caller uuid:=auth.uid(); story uuid;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 IF _media_path IS NOT NULL AND (split_part(_media_path,'/',1)<>caller::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='social-stories' AND name=_media_path AND owner_id=caller::text)) THEN RAISE EXCEPTION 'Foto do story inválida.'; END IF;
 INSERT INTO public.social_stories(user_id,caption,media_path) VALUES(caller,trim(COALESCE(_caption,'')),_media_path) RETURNING id INTO story;
 RETURN story;
END; $$;
CREATE OR REPLACE FUNCTION public.social_mark_read(_conversation_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.social_messages SET read_at=COALESCE(read_at,now()) WHERE conversation_id=_conversation_id AND sender_id<>auth.uid() AND EXISTS(SELECT 1 FROM public.social_conversations c WHERE c.id=_conversation_id AND auth.uid() IN(c.member_a,c.member_b)) $$;
REVOKE ALL ON FUNCTION public.social_open_by_phone(text),public.social_contact_profiles(),public.social_publish_story(text,text),public.social_mark_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_open_by_phone(text),public.social_contact_profiles(),public.social_publish_story(text,text),public.social_mark_read(uuid) TO authenticated,service_role;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='social_messages') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.social_messages; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='social_conversations') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.social_conversations; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='social_stories') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.social_stories; END IF;
END $$;