
-- Mensagens: editar, apagar e enviar áudio/foto
ALTER TABLE public.social_messages ADD COLUMN kind text NOT NULL DEFAULT 'text';
ALTER TABLE public.social_messages ADD COLUMN media_path text;
ALTER TABLE public.social_messages ADD COLUMN edited_at timestamptz;
CREATE POLICY social_messages_update_own ON public.social_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY social_messages_delete_own ON public.social_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- Participante pode apagar a conversa (remove as mensagens junto)
CREATE POLICY social_conversations_delete_member ON public.social_conversations FOR DELETE TO authenticated
  USING (member_a = auth.uid() OR member_b = auth.uid());

-- Grupos (criados pelo administrador)
CREATE TABLE public.social_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_groups TO authenticated;
GRANT ALL ON public.social_groups TO service_role;
ALTER TABLE public.social_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.social_group_members (
  group_id uuid NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.social_group_members TO authenticated;
GRANT ALL ON public.social_group_members TO service_role;
ALTER TABLE public.social_group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.social_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  media_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_group_messages TO authenticated;
GRANT ALL ON public.social_group_messages TO service_role;
ALTER TABLE public.social_group_messages ENABLE ROW LEVEL SECURITY;

-- Admin gerencia grupos; membros leem o grupo e as mensagens
CREATE POLICY social_groups_admin_all ON public.social_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY social_groups_member_read ON public.social_groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.social_group_members m WHERE m.group_id = id AND m.user_id = auth.uid()));

CREATE POLICY social_group_members_admin_all ON public.social_group_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY social_group_members_self_read ON public.social_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY social_group_messages_member_read ON public.social_group_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.social_group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid()));
CREATE POLICY social_group_messages_member_insert ON public.social_group_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.social_group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid()));
CREATE POLICY social_group_messages_delete_own ON public.social_group_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
