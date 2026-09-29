CREATE OR REPLACE FUNCTION public.touch_order_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.order_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_order_conversation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_order_conversation() FROM anon;
REVOKE ALL ON FUNCTION public.touch_order_conversation() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.touch_order_conversation() TO service_role;