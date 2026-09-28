DROP POLICY IF EXISTS "seller reads store orders" ON public.orders;
CREATE POLICY "seller reads store orders"
ON public.orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.payment_transactions pt
    JOIN public.stores s ON s.id = pt.store_id
    WHERE pt.order_id = orders.id
      AND s.owner_id = auth.uid()
  )
);