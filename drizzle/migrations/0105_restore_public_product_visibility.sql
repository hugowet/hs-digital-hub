ALTER POLICY "seller reads own products" ON public.products
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = products.store_id
        AND s.owner_id = (SELECT auth.uid())
    )
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role))
  );