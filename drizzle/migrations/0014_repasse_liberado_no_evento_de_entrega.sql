-- A etapa de entrega é registrada em order_tracking_events; o repasse segue esse evento
DROP TRIGGER IF EXISTS trg_release_payout_on_delivery ON public.orders;
DROP FUNCTION IF EXISTS public.release_payout_on_delivery();

CREATE OR REPLACE FUNCTION public.release_payout_on_delivery_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' THEN
    UPDATE public.orders o
    SET payout_status = 'released', payout_released_at = now()
    WHERE o.id = NEW.order_id AND o.payout_status = 'held';

    IF FOUND THEN
      UPDATE public.stores s
      SET balance = s.balance + COALESCE((
        SELECT SUM(oi.seller_amount)
        FROM public.order_items oi
        WHERE oi.order_id = NEW.order_id AND oi.store_id = s.id
      ), 0)
      WHERE s.id IN (SELECT DISTINCT store_id FROM public.order_items WHERE order_id = NEW.order_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_payout_on_delivery_event ON public.order_tracking_events;
CREATE TRIGGER trg_release_payout_on_delivery_event
AFTER INSERT ON public.order_tracking_events
FOR EACH ROW
EXECUTE FUNCTION public.release_payout_on_delivery_event();