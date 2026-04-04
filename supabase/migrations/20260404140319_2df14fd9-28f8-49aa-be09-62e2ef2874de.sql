
-- 1. Create itens_cotacao table
CREATE TABLE public.itens_cotacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text DEFAULT 'un',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.itens_cotacao ENABLE ROW LEVEL SECURITY;

-- 2. RLS for itens_cotacao (owner access)
CREATE POLICY "itens_cotacao_user" ON public.itens_cotacao FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM cotacoes c
    JOIN obras o ON o.id = c.obra_id
    WHERE c.id = itens_cotacao.cotacao_id AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotacoes c
    JOIN obras o ON o.id = c.obra_id
    WHERE c.id = itens_cotacao.cotacao_id AND o.user_id = auth.uid()
  )
);

-- 3. Public read access for cotacoes via token
CREATE POLICY "cotacoes_public_token" ON public.cotacoes FOR SELECT
TO anon
USING (token_publico IS NOT NULL AND (data_expiracao IS NULL OR data_expiracao >= CURRENT_DATE));

-- 4. Public read access for itens_cotacao via token
CREATE POLICY "itens_cotacao_public" ON public.itens_cotacao FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM cotacoes c
    WHERE c.id = itens_cotacao.cotacao_id
    AND c.token_publico IS NOT NULL
    AND (c.data_expiracao IS NULL OR c.data_expiracao >= CURRENT_DATE)
  )
);

-- 5. Allow anon to insert propostas (supplier portal)
CREATE POLICY "propostas_anon_insert" ON public.propostas FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotacoes c
    WHERE c.id = propostas.cotacao_id
    AND c.token_publico IS NOT NULL
    AND (c.data_expiracao IS NULL OR c.data_expiracao >= CURRENT_DATE)
  )
);

-- 6. Allow anon to insert proposta_itens
CREATE POLICY "proposta_itens_anon_insert" ON public.proposta_itens FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM propostas p
    JOIN cotacoes c ON c.id = p.cotacao_id
    WHERE p.id = proposta_itens.proposta_id
    AND c.token_publico IS NOT NULL
  )
);

-- 7. Allow anon to insert fornecedores (auto-create)
CREATE POLICY "fornecedores_anon_insert" ON public.fornecedores FOR INSERT
TO anon
WITH CHECK (true);
