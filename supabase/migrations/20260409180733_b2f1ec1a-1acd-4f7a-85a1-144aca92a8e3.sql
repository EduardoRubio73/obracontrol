CREATE TABLE public.tarefas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tarefas_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tarefas_padrao"
  ON public.tarefas_padrao FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());