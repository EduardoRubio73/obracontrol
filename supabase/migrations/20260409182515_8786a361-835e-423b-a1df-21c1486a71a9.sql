
CREATE TABLE public.obra_status_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo text NOT NULL,
  justificativa text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_status_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own obra_status_historico"
  ON public.obra_status_historico FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_obra_status_historico_obra ON public.obra_status_historico(obra_id);
