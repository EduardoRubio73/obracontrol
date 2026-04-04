
-- Tabela obra_dossie — linha do tempo de eventos da obra
CREATE TABLE public.obra_dossie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  dados jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.obra_dossie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obra_dossie_user" ON public.obra_dossie FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Novos campos em obras
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS classificacao text DEFAULT 'simples';
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS escopo_ia text;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS profissional_recomendado text;
