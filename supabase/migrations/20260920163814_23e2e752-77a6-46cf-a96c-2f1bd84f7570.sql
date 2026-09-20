CREATE POLICY "sellers upload product images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND EXISTS (
  SELECT 1 FROM public.stores s WHERE s.owner_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]
));

CREATE POLICY "sellers manage product images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND EXISTS (
  SELECT 1 FROM public.stores s WHERE s.owner_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]
));

CREATE POLICY "sellers delete product images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND EXISTS (
  SELECT 1 FROM public.stores s WHERE s.owner_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]
));

CREATE POLICY "read product images" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-images');