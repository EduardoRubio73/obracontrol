-- ============================================================================
-- Serviço → Etapas → Tarefas (hierarquia fixa, sem fuzzy) + Insumos padrão.
-- ============================================================================

CREATE TABLE public.catalogo_servico_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid NOT NULL REFERENCES public.catalogo_servicos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  tempo_medio_dias numeric,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_catalogo_servico_etapas_servico ON public.catalogo_servico_etapas (servico_id);

CREATE TABLE public.catalogo_etapa_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id uuid NOT NULL REFERENCES public.catalogo_servico_etapas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ordem int NOT NULL DEFAULT 0,
  criterios_qualidade text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_catalogo_etapa_tarefas_etapa ON public.catalogo_etapa_tarefas (etapa_id);

-- Insumos padrão por serviço. nome_insumo é texto livre (não FK para
-- "produtos", que é catálogo privado por usuário) — na expansão para a obra,
-- match_produto() resolve/cria o produto dentro do catálogo do usuário.
CREATE TABLE public.catalogo_servico_insumos_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid NOT NULL REFERENCES public.catalogo_servicos(id) ON DELETE CASCADE,
  nome_insumo text NOT NULL,
  unidade text NOT NULL,
  quantidade_sugerida numeric NOT NULL,
  perda_percentual numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_catalogo_servico_insumos_servico ON public.catalogo_servico_insumos_padrao (servico_id);

ALTER TABLE public.catalogo_servico_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_etapa_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_servico_insumos_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalogo_servico_etapas_select ON public.catalogo_servico_etapas FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_servico_etapas_write ON public.catalogo_servico_etapas FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

CREATE POLICY catalogo_etapa_tarefas_select ON public.catalogo_etapa_tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_etapa_tarefas_write ON public.catalogo_etapa_tarefas FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

CREATE POLICY catalogo_servico_insumos_select ON public.catalogo_servico_insumos_padrao FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_servico_insumos_write ON public.catalogo_servico_insumos_padrao FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

GRANT SELECT ON public.catalogo_servico_etapas, public.catalogo_etapa_tarefas,
  public.catalogo_servico_insumos_padrao TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalogo_servico_etapas, public.catalogo_etapa_tarefas,
  public.catalogo_servico_insumos_padrao TO authenticated;
