INSERT INTO storage.buckets (id, name, public) VALUES ('obras', 'obras', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads to obras" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'obras');
CREATE POLICY "Allow authenticated reads from obras" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'obras');
CREATE POLICY "Allow public reads from obras" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'obras');