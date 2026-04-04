
-- 1. Enable RLS
ALTER TABLE public.cotacao_fornecedores ENABLE ROW LEVEL SECURITY;

-- 2. Owner access
CREATE POLICY "cotacao_fornecedores_user" ON public.cotacao_fornecedores FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM cotacoes c
    JOIN obras o ON o.id = c.obra_id
    WHERE c.id = cotacao_fornecedores.cotacao_id AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotacoes c
    JOIN obras o ON o.id = c.obra_id
    WHERE c.id = cotacao_fornecedores.cotacao_id AND o.user_id = auth.uid()
  )
);

-- 3. Anon update (portal tracking)
CREATE POLICY "cotacao_fornecedores_anon_update" ON public.cotacao_fornecedores FOR UPDATE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM cotacoes c
    WHERE c.id = cotacao_fornecedores.cotacao_id AND c.token_publico IS NOT NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotacoes c
    WHERE c.id = cotacao_fornecedores.cotacao_id AND c.token_publico IS NOT NULL
  )
);

-- 4. Anon select
CREATE POLICY "cotacao_fornecedores_anon_select" ON public.cotacao_fornecedores FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM cotacoes c
    WHERE c.id = cotacao_fornecedores.cotacao_id AND c.token_publico IS NOT NULL
  )
);

-- 5. Expiration function
CREATE OR REPLACE FUNCTION public.expirar_cotacoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cotacao_fornecedores
  SET status = 'expirado'
  WHERE prazo_limite < now()
  AND status IN ('pendente', 'enviado', 'visualizado');
END;
$$;
