-- ============================================================================
-- Templates + tabelas de junção N:N (template x tipo_obra, template x ambiente,
-- template x serviço). Mesmo padrão de RLS do arquivo anterior.
-- ============================================================================

CREATE TABLE public.catalogo_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.catalogo_template_tipos_obra (
  template_id uuid NOT NULL REFERENCES public.catalogo_templates(id) ON DELETE CASCADE,
  tipo_obra_id uuid NOT NULL REFERENCES public.catalogo_tipos_obra(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, tipo_obra_id)
);

CREATE TABLE public.catalogo_template_ambientes (
  template_id uuid NOT NULL REFERENCES public.catalogo_templates(id) ON DELETE CASCADE,
  ambiente_id uuid NOT NULL REFERENCES public.catalogo_ambientes(id) ON DELETE CASCADE,
  obrigatorio boolean NOT NULL DEFAULT false,
  PRIMARY KEY (template_id, ambiente_id)
);

CREATE TABLE public.catalogo_template_servicos (
  template_id uuid NOT NULL REFERENCES public.catalogo_templates(id) ON DELETE CASCADE,
  servico_id uuid NOT NULL REFERENCES public.catalogo_servicos(id) ON DELETE CASCADE,
  ambiente_id uuid REFERENCES public.catalogo_ambientes(id) ON DELETE SET NULL,
  ordem int,
  obrigatorio boolean NOT NULL DEFAULT false,
  PRIMARY KEY (template_id, servico_id)
);

ALTER TABLE public.catalogo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_template_tipos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_template_ambientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_template_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalogo_templates_select ON public.catalogo_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_templates_write ON public.catalogo_templates FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

CREATE POLICY catalogo_template_tipos_obra_select ON public.catalogo_template_tipos_obra FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_template_tipos_obra_write ON public.catalogo_template_tipos_obra FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

CREATE POLICY catalogo_template_ambientes_select ON public.catalogo_template_ambientes FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_template_ambientes_write ON public.catalogo_template_ambientes FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

CREATE POLICY catalogo_template_servicos_select ON public.catalogo_template_servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_template_servicos_write ON public.catalogo_template_servicos FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

GRANT SELECT ON public.catalogo_templates, public.catalogo_template_tipos_obra,
  public.catalogo_template_ambientes, public.catalogo_template_servicos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalogo_templates, public.catalogo_template_tipos_obra,
  public.catalogo_template_ambientes, public.catalogo_template_servicos TO authenticated;

CREATE INDEX idx_catalogo_template_servicos_servico ON public.catalogo_template_servicos (servico_id);
CREATE INDEX idx_catalogo_template_tipos_obra_tipo ON public.catalogo_template_tipos_obra (tipo_obra_id);
