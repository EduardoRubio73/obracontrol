
-- 1. Add user_id to documentos table
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- 2. Add RLS policies for documentos
CREATE POLICY "documentos_user_select" ON public.documentos FOR SELECT USING (
  EXISTS (SELECT 1 FROM obras o WHERE o.id = documentos.obra_id AND o.user_id = auth.uid())
);
CREATE POLICY "documentos_user_insert" ON public.documentos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM obras o WHERE o.id = documentos.obra_id AND o.user_id = auth.uid())
);
CREATE POLICY "documentos_user_delete" ON public.documentos FOR DELETE USING (
  EXISTS (SELECT 1 FROM obras o WHERE o.id = documentos.obra_id AND o.user_id = auth.uid())
);

-- 3. Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies
CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
