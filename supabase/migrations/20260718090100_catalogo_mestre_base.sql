-- ============================================================================
-- Catálogo Mestre (global) — tipos_obra, ambientes, serviços.
-- Leitura liberada a todo authenticated; escrita restrita a admin (fn_is_admin()).
-- Distintos das tabelas per-user "tipos_obra"/"etapas_padrao"/"tarefas_padrao"
-- já existentes (essas continuam servindo customização pessoal do usuário).
--
-- Nota: nenhuma outra tabela do projeto usa unaccent() hoje (o fuzzy matching
-- de produtos roda em Python, não em Postgres — ver core/normalize.py).
-- Habilitamos aqui porque catalogo_servicos precisa de índice normalizado
-- para o match_servico() futuro; se preferir manter tudo em Python/Edge
-- Function, remova a coluna nome_normalizado e o trigger abaixo.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE public.catalogo_tipos_obra (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.catalogo_ambientes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.catalogo_servicos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  nome_normalizado text NOT NULL,
  descricao text,
  prioridade int,
  tempo_medio_dias numeric,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_catalogo_servicos_nome_normalizado ON public.catalogo_servicos (nome_normalizado);

-- Trigger de normalização (reaproveita o padrão já usado em produtos)
CREATE OR REPLACE FUNCTION public.fn_normalize_catalogo_servico()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.nome_normalizado := lower(unaccent(trim(NEW.nome)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_catalogo_servico
  BEFORE INSERT OR UPDATE OF nome ON public.catalogo_servicos
  FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_catalogo_servico();

-- RLS: leitura geral, escrita só admin
ALTER TABLE public.catalogo_tipos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_ambientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalogo_tipos_obra_select ON public.catalogo_tipos_obra FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_tipos_obra_write ON public.catalogo_tipos_obra FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

CREATE POLICY catalogo_ambientes_select ON public.catalogo_ambientes FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_ambientes_write ON public.catalogo_ambientes FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

CREATE POLICY catalogo_servicos_select ON public.catalogo_servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogo_servicos_write ON public.catalogo_servicos FOR ALL TO authenticated
  USING (fn_is_admin()) WITH CHECK (fn_is_admin());

GRANT SELECT ON public.catalogo_tipos_obra, public.catalogo_ambientes, public.catalogo_servicos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalogo_tipos_obra, public.catalogo_ambientes, public.catalogo_servicos TO authenticated;
