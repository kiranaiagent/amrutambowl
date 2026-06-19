
CREATE POLICY "Public read meal-images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'meal-images');
CREATE POLICY "Admins upload meal-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update meal-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'meal-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete meal-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meal-images' AND public.has_role(auth.uid(), 'admin'));
