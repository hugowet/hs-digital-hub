DROP POLICY "owner creates store" ON public.stores;

CREATE POLICY "seller creates own store"
ON public.stores
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND public.has_role(auth.uid(), 'seller')
);