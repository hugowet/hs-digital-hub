ALTER TABLE public.order_tracking_events ADD COLUMN occurred_at timestamptz;
ALTER TABLE public.order_tracking_events DROP CONSTRAINT order_tracking_events_status_check;
ALTER TABLE public.order_tracking_events ADD CONSTRAINT order_tracking_events_status_check CHECK (status IN ('confirmed','preparing','packed','shipped','arrived_in_city','out_for_delivery','delivered','delivery_attempted'));
CREATE OR REPLACE FUNCTION public.validate_delivery_attempt_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders;
BEGIN
 IF NEW.status <> 'delivery_attempted' THEN RETURN NEW; END IF;
 IF auth.uid() IS NULL OR NEW.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sessão obrigatória.'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=NEW.order_id FOR UPDATE;
 IF o.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.order_items oi JOIN public.stores s ON s.id=oi.store_id WHERE oi.order_id=NEW.order_id AND s.owner_id=auth.uid()) THEN RAISE EXCEPTION 'Pedido não pertence à loja.'; END IF;
 IF o.payment_status NOT IN ('paid','approved') THEN RAISE EXCEPTION 'Aguarde o pagamento aprovado.'; END IF;
 IF o.status='delivered' OR EXISTS (SELECT 1 FROM public.order_tracking_events WHERE order_id=NEW.order_id AND status='delivered') THEN RAISE EXCEPTION 'Pedido já entregue.'; END IF;
 IF NEW.occurred_at IS NULL OR NEW.occurred_at > now() OR NEW.occurred_at < o.created_at THEN RAISE EXCEPTION 'Informe a data e hora reais da tentativa, após o pedido e não no futuro.'; END IF;
 IF NEW.note IS NULL OR length(btrim(NEW.note)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Informe o motivo em até 500 caracteres.'; END IF;
 NEW.note := btrim(NEW.note);
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_delivery_attempt_event BEFORE INSERT ON public.order_tracking_events FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_attempt_event();
CREATE OR REPLACE FUNCTION public.record_seller_delivery_attempt(_store_id uuid,_order_id uuid,_occurred_at timestamptz,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET lock_timeout='3s' SET statement_timeout='5s' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão obrigatória.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.stores s JOIN public.order_items oi ON oi.store_id=s.id WHERE s.id=_store_id AND s.owner_id=auth.uid() AND oi.order_id=_order_id) THEN RAISE EXCEPTION 'Pedido não pertence à loja.'; END IF;
 INSERT INTO public.order_tracking_events(order_id,status,note,created_by,occurred_at) VALUES (_order_id,'delivery_attempted',_note,auth.uid(),_occurred_at);
END; $$;
REVOKE ALL ON FUNCTION public.record_seller_delivery_attempt(uuid,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_seller_delivery_attempt(uuid,uuid,timestamptz,text) TO authenticated;
REVOKE ALL ON FUNCTION public.validate_delivery_attempt_event() FROM PUBLIC,anon;