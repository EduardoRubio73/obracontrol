-- ============================================================================
-- Snapshot da obra: obra_servicos (nova) + colunas de rastreabilidade em
-- obra_fases (= etapas da obra) e fase_itens (= tarefas da obra), que já
-- existem e já têm triggers de progresso/status/alerta. Nada aqui referencia
-- o catálogo em FK "viva": catalogo_*_id é só rastro (ON DELETE SET NULL),
-- alterar o catálogo depois nunca muda a obra já criada.
-- ============================================================================

CREATE TABLE public.obra_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  catalogo_servico_id uuid REFERENCES public.catalogo_servicos(id) ON DELETE SET NULL,
  ambiente_id uuid REFERENCES public.catalogo_ambientes(id) ON DELETE SET NULL,
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_obra_servicos_obra ON public.obra_servicos (obra_id);

ALTER TABLE public.obra_fases
  ADD COLUMN obra_servico_id uuid REFERENCES public.obra_servicos(id) ON DELETE SET NULL,
  ADD COLUMN catalogo_etapa_id uuid REFERENCES public.catalogo_servico_etapas(id) ON DELETE SET NULL;
CREATE INDEX idx_obra_fases_obra_servico ON public.obra_fases (obra_servico_id);

ALTER TABLE public.fase_itens
  ADD COLUMN catalogo_tarefa_id uuid REFERENCES public.catalogo_etapa_tarefas(id) ON DELETE SET NULL;

-- Insumos da obra (expandidos de catalogo_servico_insumos_padrao), já
-- vinculados ao produto real do usuário (resolvido via match_produto na
-- expansão) para alimentar Compras/Cotações/Financeiro automaticamente.
CREATE TABLE public.obra_servico_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_servico_id uuid NOT NULL REFERENCES public.obra_servicos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  nome_insumo text NOT NULL,
  unidade text NOT NULL,
  quantidade_sugerida numeric NOT NULL,
  perda_percentual numeric NOT NULL DEFAULT 0,
  quantidade_final numeric GENERATED ALWAYS AS (quantidade_sugerida * (1 + perda_percentual / 100.0)) STORED,
  compra_id uuid REFERENCES public.compras(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_obra_servico_insumos_servico ON public.obra_servico_insumos (obra_servico_id);

ALTER TABLE public.obra_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_servico_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY obra_servicos_user ON public.obra_servicos FOR ALL
  USING (EXISTS (SELECT 1 FROM obras o WHERE o.id = obra_servicos.obra_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM obras o WHERE o.id = obra_servicos.obra_id AND o.user_id = auth.uid()));

CREATE POLICY obra_servico_insumos_user ON public.obra_servico_insumos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM obra_servicos s JOIN obras o ON o.id = s.obra_id
    WHERE s.id = obra_servico_insumos.obra_servico_id AND o.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM obra_servicos s JOIN obras o ON o.id = s.obra_id
    WHERE s.id = obra_servico_insumos.obra_servico_id AND o.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_servicos, public.obra_servico_insumos TO authenticated;
