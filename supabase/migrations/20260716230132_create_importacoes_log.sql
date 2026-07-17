CREATE TABLE public.importacoes_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  arquivo_nome text NOT NULL,
  arquivo_hash text NOT NULL,
  tipo_documento text,
  confianca numeric,
  itens_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.importacoes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own importacoes_log"
  ON public.importacoes_log FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX importacoes_log_user_hash_unq ON public.importacoes_log(user_id, arquivo_hash);
CREATE INDEX idx_importacoes_log_obra ON public.importacoes_log(obra_id);
