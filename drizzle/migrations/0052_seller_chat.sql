CREATE TABLE public.product_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, buyer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_conversations TO authenticated;
GRANT ALL ON public.product_conversations TO service_role;
ALTER TABLE public.product_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.product_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_messages TO authenticated;
GRANT ALL ON public.product_messages TO service_role;
ALTER TABLE public.product_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_conversations_select ON public.product_conversations FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY product_conversations_insert ON public.product_conversations FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY product_conversations_update ON public.product_conversations FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE POLICY product_messages_select ON public.product_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = c.store_id AND s.owner_id = auth.uid()))));
CREATE POLICY product_messages_insert ON public.product_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.product_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = c.store_id AND s.owner_id = auth.uid()))));
CREATE POLICY product_messages_update ON public.product_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = c.store_id AND s.owner_id = auth.uid()))));

ALTER PUBLICATION supabase_realtime ADD TABLE public.product_messages;