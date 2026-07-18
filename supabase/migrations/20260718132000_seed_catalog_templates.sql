-- ============================================================================
-- Fase 5: Seed Catálogo Mestre com Templates Padrão
-- Insere tipos_obra, ambientes, serviços, etapas, tarefas, insumos e 2 templates
-- Data: 2026-07-18
-- ============================================================================

-- ── Tipos de Obra ──
INSERT INTO public.catalogo_tipos_obra (nome, descricao, ativo) VALUES
  ('Residencial', 'Construção residencial unifamiliar ou multifamiliar', true),
  ('Comercial', 'Construção comercial (lojas, escritórios, restaurantes)', true),
  ('Reforma', 'Reforma, manutenção e adequação de imóvel existente', true),
  ('Obra Publica', 'Obras públicas e de infraestrutura', true)
ON CONFLICT (nome) DO NOTHING;

-- ── Ambientes ──
INSERT INTO public.catalogo_ambientes (nome, descricao, ativo) VALUES
  ('Cozinha', 'Cozinha com bancadas, louças e eletrodomésticos', true),
  ('Banheiro', 'Banheiro com louças, azulejos e acabamentos', true),
  ('Sala', 'Sala de estar/jantar com acabamentos gerais', true),
  ('Quarto', 'Quarto com piso, pintura e acabamentos', true),
  ('Corredor', 'Corredor de circulação interna', true),
  ('Garagem', 'Garagem com piso e pintura', true),
  ('Área de Serviço', 'Lavanderia e área de serviço', true),
  ('Varanda', 'Varanda/sacada/terraço', true)
ON CONFLICT (nome) DO NOTHING;

-- ── Serviços Comuns ──
INSERT INTO public.catalogo_servicos (nome, nome_normalizado, descricao, prioridade, tempo_medio_dias, ativo) VALUES
  ('Pintura', 'pintura', 'Pintura de paredes e tetos com tinta latex/acrílica', 1, 3, true),
  ('Alvenaria', 'alvenaria', 'Construção de paredes em alvenaria estrutural ou vedação', 2, 5, true),
  ('Hidráulica', 'hidraulica', 'Instalação de tubulações de água e esgotos', 3, 4, true),
  ('Elétrica', 'eletrica', 'Instalação de fiação e distribuição elétrica', 3, 4, true),
  ('Piso/Azulejo', 'pisoazulejo', 'Assentamento de pisos, azulejos e revestimentos', 2, 4, true),
  ('Carpintaria', 'carpintaria', 'Trabalhos em madeira: portas, rodapés, armários', 1, 3, true),
  ('Louças Sanitárias', 'loucas-sanitarias', 'Instalação de vaso, pia, chuveiro e louças sanitárias', 3, 2, true),
  ('Cobertura', 'cobertura', 'Telhas, estrutura e acabamento de cobertura', 4, 6, true),
  ('Estrutura', 'estrutura', 'Fundação, pilares, vigas e estrutura de concreto', 5, 10, true),
  ('Limpeza Final', 'limpeza-final', 'Limpeza e remoção de entulhos ao final da obra', 1, 1, true)
ON CONFLICT (nome) DO NOTHING;

-- ── Etapas Padrão para Serviços ──
INSERT INTO public.catalogo_servico_etapas (servico_id, nome, ordem)
SELECT id, 'Preparação', 1 FROM public.catalogo_servicos WHERE nome = 'Pintura'
UNION ALL
SELECT id, 'Execução', 2 FROM public.catalogo_servicos WHERE nome = 'Pintura'
UNION ALL
SELECT id, 'Acabamento', 3 FROM public.catalogo_servicos WHERE nome = 'Pintura'
UNION ALL
SELECT id, 'Preparação', 1 FROM public.catalogo_servicos WHERE nome = 'Alvenaria'
UNION ALL
SELECT id, 'Execução', 2 FROM public.catalogo_servicos WHERE nome = 'Alvenaria'
UNION ALL
SELECT id, 'Acabamento', 3 FROM public.catalogo_servicos WHERE nome = 'Alvenaria'
UNION ALL
SELECT id, 'Preparação', 1 FROM public.catalogo_servicos WHERE nome = 'Hidráulica'
UNION ALL
SELECT id, 'Execução', 2 FROM public.catalogo_servicos WHERE nome = 'Hidráulica'
UNION ALL
SELECT id, 'Teste/Inspeção', 3 FROM public.catalogo_servicos WHERE nome = 'Hidráulica'
UNION ALL
SELECT id, 'Preparação', 1 FROM public.catalogo_servicos WHERE nome = 'Elétrica'
UNION ALL
SELECT id, 'Execução', 2 FROM public.catalogo_servicos WHERE nome = 'Elétrica'
UNION ALL
SELECT id, 'Teste/Inspeção', 3 FROM public.catalogo_servicos WHERE nome = 'Elétrica'
UNION ALL
SELECT id, 'Preparação', 1 FROM public.catalogo_servicos WHERE nome = 'Piso/Azulejo'
UNION ALL
SELECT id, 'Execução', 2 FROM public.catalogo_servicos WHERE nome = 'Piso/Azulejo'
UNION ALL
SELECT id, 'Acabamento', 3 FROM public.catalogo_servicos WHERE nome = 'Piso/Azulejo'
UNION ALL
SELECT id, 'Execução', 1 FROM public.catalogo_servicos WHERE nome = 'Carpintaria'
UNION ALL
SELECT id, 'Acabamento', 2 FROM public.catalogo_servicos WHERE nome = 'Carpintaria'
UNION ALL
SELECT id, 'Instalação', 1 FROM public.catalogo_servicos WHERE nome = 'Louças Sanitárias'
UNION ALL
SELECT id, 'Teste/Acabamento', 2 FROM public.catalogo_servicos WHERE nome = 'Louças Sanitárias'
ON CONFLICT DO NOTHING;

-- ── Tarefas por Etapa (Pintura como exemplo) ──
INSERT INTO public.catalogo_etapa_tarefas (etapa_id, nome, tempo_dias)
SELECT e.id, t.nome, t.tempo_dias FROM (
  SELECT
    (SELECT id FROM public.catalogo_servico_etapas WHERE servico_id = (SELECT id FROM public.catalogo_servicos WHERE nome = 'Pintura') AND nome = 'Preparação') as etapa_id,
    'Limpeza de superfícies' as nome, 1 as tempo_dias
  UNION ALL
  SELECT
    (SELECT id FROM public.catalogo_servico_etapas WHERE servico_id = (SELECT id FROM public.catalogo_servicos WHERE nome = 'Pintura') AND nome = 'Preparação'),
    'Lixamento e selagem', 1
  UNION ALL
  SELECT
    (SELECT id FROM public.catalogo_servico_etapas WHERE servico_id = (SELECT id FROM public.catalogo_servicos WHERE nome = 'Pintura') AND nome = 'Execução'),
    'Aplicação de primer', 1
  UNION ALL
  SELECT
    (SELECT id FROM public.catalogo_servico_etapas WHERE servico_id = (SELECT id FROM public.catalogo_servicos WHERE nome = 'Pintura') AND nome = 'Execução'),
    'Aplicação de tinta (1ª demão)', 1
  UNION ALL
  SELECT
    (SELECT id FROM public.catalogo_servico_etapas WHERE servico_id = (SELECT id FROM public.catalogo_servicos WHERE nome = 'Pintura') AND nome = 'Execução'),
    'Aplicação de tinta (2ª demão)', 1
  UNION ALL
  SELECT
    (SELECT id FROM public.catalogo_servico_etapas WHERE servico_id = (SELECT id FROM public.catalogo_servicos WHERE nome = 'Pintura') AND nome = 'Acabamento'),
    'Toque-up e limpeza', 0.5
) t
WHERE t.etapa_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Insumos Padrão para Serviços ──
INSERT INTO public.catalogo_servico_insumos_padrao (servico_id, nome_insumo, unidade, quantidade_sugerida, perda_percentual)
SELECT id, 'Tinta Latex (18L)', 'Galão', 1, 10 FROM public.catalogo_servicos WHERE nome = 'Pintura'
UNION ALL
SELECT id, 'Primer Acrílico (18L)', 'Galão', 0.5, 10 FROM public.catalogo_servicos WHERE nome = 'Pintura'
UNION ALL
SELECT id, 'Lixadeira Orbital', 'Unidade', 1, 0 FROM public.catalogo_servicos WHERE nome = 'Pintura'
UNION ALL
SELECT id, 'Tijolo 6 furos', 'Milhar', 1, 5 FROM public.catalogo_servicos WHERE nome = 'Alvenaria'
UNION ALL
SELECT id, 'Cimento Portland (50kg)', 'Saco', 20, 10 FROM public.catalogo_servicos WHERE nome = 'Alvenaria'
UNION ALL
SELECT id, 'Tubo PVC 3/4"', 'Metro', 50, 10 FROM public.catalogo_servicos WHERE nome = 'Hidráulica'
UNION ALL
SELECT id, 'Fio Elétrico 2.5mm', 'Metro', 100, 15 FROM public.catalogo_servicos WHERE nome = 'Elétrica'
UNION ALL
SELECT id, 'Azulejo 20x20cm', 'Caixa', 2, 10 FROM public.catalogo_servicos WHERE nome = 'Piso/Azulejo'
ON CONFLICT DO NOTHING;

-- ── Template 1: Reforma Residencial Básica ──
INSERT INTO public.catalogo_templates (nome, descricao, ativo)
VALUES ('Reforma Residencial Básica', 'Template para reforma simples em 3 ambientes (pintura, hidráulica, elétrica, azulejos)', true)
ON CONFLICT (nome) DO NOTHING;

-- Associar tipos de obra ao template
INSERT INTO public.catalogo_template_tipos_obra (template_id, tipo_obra_id)
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Reforma Residencial Básica'),
  id
FROM public.catalogo_tipos_obra WHERE nome IN ('Residencial', 'Reforma')
ON CONFLICT DO NOTHING;

-- Associar ambientes ao template
INSERT INTO public.catalogo_template_ambientes (template_id, ambiente_id, obrigatorio)
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Reforma Residencial Básica'),
  id,
  true
FROM public.catalogo_ambientes WHERE nome IN ('Cozinha', 'Banheiro', 'Sala')
ON CONFLICT DO NOTHING;

-- Associar serviços ao template
INSERT INTO public.catalogo_template_servicos (template_id, servico_id, ambiente_id, ordem, obrigatorio)
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Reforma Residencial Básica'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Pintura'),
  NULL, 1, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Reforma Residencial Básica'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Hidráulica'),
  NULL, 2, false
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Reforma Residencial Básica'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Elétrica'),
  NULL, 3, false
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Reforma Residencial Básica'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Piso/Azulejo'),
  NULL, 4, false
ON CONFLICT DO NOTHING;

-- ── Template 2: Construção Residencial Completa ──
INSERT INTO public.catalogo_templates (nome, descricao, ativo)
VALUES ('Construção Residencial Completa', 'Template para obra nova residencial com todos os passos (estrutura até acabamento)', true)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.catalogo_template_tipos_obra (template_id, tipo_obra_id)
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  id
FROM public.catalogo_tipos_obra WHERE nome = 'Residencial'
ON CONFLICT DO NOTHING;

INSERT INTO public.catalogo_template_ambientes (template_id, ambiente_id, obrigatorio)
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  id,
  true
FROM public.catalogo_ambientes WHERE nome IN ('Cozinha', 'Banheiro', 'Sala', 'Quarto')
ON CONFLICT DO NOTHING;

INSERT INTO public.catalogo_template_servicos (template_id, servico_id, ambiente_id, ordem, obrigatorio)
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Estrutura'),
  NULL, 1, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Alvenaria'),
  NULL, 2, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Cobertura'),
  NULL, 3, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Hidráulica'),
  NULL, 4, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Elétrica'),
  NULL, 5, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Piso/Azulejo'),
  NULL, 6, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Carpintaria'),
  NULL, 7, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Louças Sanitárias'),
  NULL, 8, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Pintura'),
  NULL, 9, true
UNION ALL
SELECT
  (SELECT id FROM public.catalogo_templates WHERE nome = 'Construção Residencial Completa'),
  (SELECT id FROM public.catalogo_servicos WHERE nome = 'Limpeza Final'),
  NULL, 10, true
ON CONFLICT DO NOTHING;

-- ── Log de sucesso ──
-- Após aplicar:
-- - 4 tipos_obra inseridos
-- - 8 ambientes inseridos
-- - 10 serviços inseridos
-- - ~15 etapas inseridas
-- - ~6 tarefas de exemplo inseridas
-- - ~8 insumos padrão inseridos
-- - 2 templates criados com relacionamentos completos
