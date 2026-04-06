
-- Fix fornecedores RLS: remove tenant dependency
DROP POLICY IF EXISTS fornecedores_select ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_insert ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_update ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_delete ON public.fornecedores;

CREATE POLICY "fornecedores_select" ON public.fornecedores FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "fornecedores_insert" ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fornecedores_update" ON public.fornecedores FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "fornecedores_delete" ON public.fornecedores FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Fix obras RLS
DROP POLICY IF EXISTS obras_select ON public.obras;
DROP POLICY IF EXISTS obras_insert ON public.obras;
DROP POLICY IF EXISTS obras_update ON public.obras;
DROP POLICY IF EXISTS obras_delete ON public.obras;

CREATE POLICY "obras_select" ON public.obras FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "obras_insert" ON public.obras FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "obras_update" ON public.obras FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "obras_delete" ON public.obras FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Fix financeiro RLS
DROP POLICY IF EXISTS financeiro_select ON public.financeiro;
DROP POLICY IF EXISTS financeiro_insert ON public.financeiro;
DROP POLICY IF EXISTS financeiro_update ON public.financeiro;
DROP POLICY IF EXISTS financeiro_delete ON public.financeiro;

CREATE POLICY "financeiro_select" ON public.financeiro FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "financeiro_insert" ON public.financeiro FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "financeiro_update" ON public.financeiro FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "financeiro_delete" ON public.financeiro FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Fix cotacoes RLS
DROP POLICY IF EXISTS cotacoes_select ON public.cotacoes;
DROP POLICY IF EXISTS cotacoes_insert ON public.cotacoes;
DROP POLICY IF EXISTS cotacoes_update ON public.cotacoes;
DROP POLICY IF EXISTS cotacoes_delete ON public.cotacoes;

CREATE POLICY "cotacoes_select" ON public.cotacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM obras o WHERE o.id = cotacoes.obra_id AND o.user_id = auth.uid())
    OR (token_publico IS NOT NULL AND (data_expiracao IS NULL OR data_expiracao >= CURRENT_DATE)));
CREATE POLICY "cotacoes_insert" ON public.cotacoes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM obras o WHERE o.id = cotacoes.obra_id AND o.user_id = auth.uid()));
CREATE POLICY "cotacoes_update" ON public.cotacoes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM obras o WHERE o.id = cotacoes.obra_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM obras o WHERE o.id = cotacoes.obra_id AND o.user_id = auth.uid()));
CREATE POLICY "cotacoes_delete" ON public.cotacoes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM obras o WHERE o.id = cotacoes.obra_id AND o.user_id = auth.uid()));

-- Fix cotacao_fornecedores RLS
DROP POLICY IF EXISTS cotacao_fornecedores_select ON public.cotacao_fornecedores;
DROP POLICY IF EXISTS cotacao_fornecedores_insert ON public.cotacao_fornecedores;
DROP POLICY IF EXISTS cotacao_fornecedores_update ON public.cotacao_fornecedores;
DROP POLICY IF EXISTS cotacao_fornecedores_delete ON public.cotacao_fornecedores;

CREATE POLICY "cotacao_fornecedores_select" ON public.cotacao_fornecedores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = cotacao_fornecedores.cotacao_id AND o.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM cotacoes c WHERE c.id = cotacao_fornecedores.cotacao_id AND c.token_publico IS NOT NULL));
CREATE POLICY "cotacao_fornecedores_insert" ON public.cotacao_fornecedores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = cotacao_fornecedores.cotacao_id AND o.user_id = auth.uid()));
CREATE POLICY "cotacao_fornecedores_update" ON public.cotacao_fornecedores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = cotacao_fornecedores.cotacao_id AND o.user_id = auth.uid()));
CREATE POLICY "cotacao_fornecedores_delete" ON public.cotacao_fornecedores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = cotacao_fornecedores.cotacao_id AND o.user_id = auth.uid()));

-- Fix itens_cotacao RLS
DROP POLICY IF EXISTS itens_cotacao_select ON public.itens_cotacao;
DROP POLICY IF EXISTS itens_cotacao_insert ON public.itens_cotacao;
DROP POLICY IF EXISTS itens_cotacao_update ON public.itens_cotacao;
DROP POLICY IF EXISTS itens_cotacao_delete ON public.itens_cotacao;

CREATE POLICY "itens_cotacao_select" ON public.itens_cotacao FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = itens_cotacao.cotacao_id AND o.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM cotacoes c WHERE c.id = itens_cotacao.cotacao_id AND c.token_publico IS NOT NULL));
CREATE POLICY "itens_cotacao_insert" ON public.itens_cotacao FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = itens_cotacao.cotacao_id AND o.user_id = auth.uid()));
CREATE POLICY "itens_cotacao_update" ON public.itens_cotacao FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = itens_cotacao.cotacao_id AND o.user_id = auth.uid()));
CREATE POLICY "itens_cotacao_delete" ON public.itens_cotacao FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = itens_cotacao.cotacao_id AND o.user_id = auth.uid()));

-- Fix propostas RLS
DROP POLICY IF EXISTS propostas_select ON public.propostas;
DROP POLICY IF EXISTS propostas_insert ON public.propostas;
DROP POLICY IF EXISTS propostas_update ON public.propostas;
DROP POLICY IF EXISTS propostas_delete ON public.propostas;

CREATE POLICY "propostas_select" ON public.propostas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = propostas.cotacao_id AND o.user_id = auth.uid()));
CREATE POLICY "propostas_insert" ON public.propostas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = propostas.cotacao_id AND o.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM cotacoes c WHERE c.id = propostas.cotacao_id AND c.token_publico IS NOT NULL AND (c.data_expiracao IS NULL OR c.data_expiracao >= CURRENT_DATE)));
CREATE POLICY "propostas_update" ON public.propostas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = propostas.cotacao_id AND o.user_id = auth.uid()));
CREATE POLICY "propostas_delete" ON public.propostas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM cotacoes c JOIN obras o ON o.id = c.obra_id WHERE c.id = propostas.cotacao_id AND o.user_id = auth.uid()));
