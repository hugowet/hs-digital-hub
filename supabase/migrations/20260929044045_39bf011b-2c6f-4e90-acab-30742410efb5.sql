CREATE TABLE public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Casa',
  recipient_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  street_address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL DEFAULT '',
  complement text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT ALL ON public.user_addresses TO service_role;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own addresses" ON public.user_addresses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users create own addresses" ON public.user_addresses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own addresses" ON public.user_addresses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own addresses" ON public.user_addresses FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE UNIQUE INDEX user_addresses_one_default_idx ON public.user_addresses(user_id) WHERE is_default;
CREATE INDEX user_addresses_user_idx ON public.user_addresses(user_id, created_at DESC);

CREATE TABLE public.order_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  subject text NOT NULL DEFAULT 'Mensagem sobre a compra',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.order_conversations TO authenticated;
GRANT ALL ON public.order_conversations TO service_role;
ALTER TABLE public.order_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyers read own conversations" ON public.order_conversations FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "buyers create own conversations" ON public.order_conversations FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));
CREATE POLICY "admins update conversations" ON public.order_conversations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.order_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read order messages" ON public.order_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "participants create order messages" ON public.order_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND char_length(trim(body)) BETWEEN 1 AND 2000 AND EXISTS (SELECT 1 FROM public.order_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "participants mark order messages read" ON public.order_messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.order_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.order_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE INDEX order_messages_conversation_idx ON public.order_messages(conversation_id, created_at);
CREATE INDEX order_messages_unread_idx ON public.order_messages(conversation_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE public.order_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('confirmed','preparing','shipped','out_for_delivery','delivered')),
  note text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_tracking_events TO authenticated;
GRANT ALL ON public.order_tracking_events TO service_role;
ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order participants read tracking" ON public.order_tracking_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.stores s ON s.id = oi.store_id WHERE oi.order_id = o.id AND s.owner_id = auth.uid()))));
CREATE POLICY "sellers and admins add tracking" ON public.order_tracking_events FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.stores s ON s.id = oi.store_id WHERE oi.order_id = order_id AND s.owner_id = auth.uid())));
CREATE INDEX order_tracking_events_order_idx ON public.order_tracking_events(order_id, created_at);

CREATE OR REPLACE FUNCTION public.set_user_address_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.user_addresses SET is_default = false, updated_at = now() WHERE user_id = NEW.user_id AND id <> NEW.id AND is_default;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_addresses_default_trigger BEFORE INSERT OR UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.set_user_address_default();

CREATE OR REPLACE FUNCTION public.touch_order_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.order_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER order_messages_touch_conversation AFTER INSERT ON public.order_messages FOR EACH ROW EXECUTE FUNCTION public.touch_order_conversation();