
-- Table for photos on etapas (before/during/after)
CREATE TABLE public.fase_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fase_id UUID NOT NULL REFERENCES public.obra_fases(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('antes', 'durante', 'depois')),
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fase_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own fase_fotos"
  ON public.fase_fotos FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table for scope changes during execution
CREATE TABLE public.obra_alteracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('escopo', 'custo', 'prazo', 'outro')),
  descricao TEXT NOT NULL,
  justificativa TEXT,
  valor_impacto NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_alteracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own obra_alteracoes"
  ON public.obra_alteracoes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
