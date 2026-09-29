DROP POLICY IF EXISTS "owners read product images" ON storage.objects;
CREATE POLICY "owners read product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

DROP POLICY IF EXISTS "sellers delete product images" ON storage.objects;
CREATE POLICY "sellers delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
);