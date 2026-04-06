-- Allow authenticated users to upload files to the documentos bucket
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- Allow authenticated users to update (upsert) their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = split_part((storage.filename(name)), '.', 1))
WITH CHECK (bucket_id = 'documentos');

-- Allow authenticated users to read files from the documentos bucket
CREATE POLICY "Users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos');