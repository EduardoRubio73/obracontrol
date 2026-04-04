ALTER TABLE public.fornecedor_metricas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedor_metricas_user" ON public.fornecedor_metricas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM fornecedores f
    WHERE f.id = fornecedor_metricas.fornecedor_id AND f.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM fornecedores f
    WHERE f.id = fornecedor_metricas.fornecedor_id AND f.user_id = auth.uid()
  )
);