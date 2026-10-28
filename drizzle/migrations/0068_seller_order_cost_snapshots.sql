CREATE TABLE public.order_item_cost_snapshots (
 order_item_id uuid PRIMARY KEY REFERENCES public.order_items(id) ON DELETE CASCADE,
 store_id uuid NOT NULL REFERENCES public.stores(id),
 supplier text,
 unit_cost_brl numeric,
 captured_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_item_cost_snapshots TO authenticated;
GRANT ALL ON public.order_item_cost_snapshots TO service_role;
ALTER TABLE public.order_item_cost_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hugo reads own sale costs" ON public.order_item_cost_snapshots FOR SELECT TO authenticated USING (lower(auth.jwt()->>'email')='hugohug12ou@gmail.com' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
CREATE FUNCTION public.capture_order_item_cost() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.products%ROWTYPE; cost numeric;
BEGIN
 SELECT * INTO p FROM public.products WHERE id=NEW.product_id;
 IF FOUND THEN
  cost := CASE WHEN p.supplier_cost_currency='USD' AND p.supplier_exchange_rate>0 THEN p.supplier_cost*p.supplier_exchange_rate WHEN p.supplier_cost_currency='BRL' OR p.supplier='amazon' THEN p.supplier_cost ELSE NULL END;
  IF cost<=0 THEN cost:=NULL; END IF;
  INSERT INTO public.order_item_cost_snapshots(order_item_id,store_id,supplier,unit_cost_brl) VALUES(NEW.id,NEW.store_id,p.supplier,cost);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_order_item_cost() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER capture_sale_cost AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.capture_order_item_cost();