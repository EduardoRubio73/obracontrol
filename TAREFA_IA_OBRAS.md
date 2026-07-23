# TAREFA — Instalar Subsistema de IA de Classificação de Obras no ObraControl

> Leia este arquivo inteiro antes de executar qualquer ação. Ele contém TODO o
> conteúdo necessário (migrations SQL + documentação) já pronto para ser criado
> nos arquivos corretos deste repositório. Não peça o conteúdo em outro lugar —
> está tudo aqui embaixo, copie exatamente.

## Objetivo

Instalar a camada de IA que classifica tipo de obra, monta fases/etapas, gera
checklist e sugere materiais (tabelas `*_padrao` + agentes já existentes em
`orquestrador.md`, `agente-classificador.md`, `agente-planejador-fases.md`,
`agente-checklist.md`, `agente-materiais.md`).

## Passo 1 — Checagem de segurança ANTES de criar qualquer arquivo

Rode contra o Supabase deste projeto (via MCP se conectado, senão via SQL Editor
do painel Supabase ou `supabase db execute`):

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'tipos_obra_padrao'
) AS ja_existe;
```

- Se `ja_existe = true`: PARE e me avise. Não prossiga sem confirmação — as
  migrations de seed abaixo não são idempotentes (rodar duas vezes duplica dados).
- Se `ja_existe = false`: siga para o Passo 2.

Se a tabela `materiais_sugeridos_padrao` já existir por qualquer motivo, rode
também antes de aplicar a migration 4 (que dropa a coluna `produto_id` dela):

```sql
SELECT count(*) FROM public.materiais_sugeridos_padrao WHERE produto_id IS NOT NULL;
```

Se retornar > 0, PARE e me avise antes de aplicar a migration 4 — ela apaga
essa coluna e os dados nela seriam perdidos.

## Passo 2 — Criar os 5 arquivos de migration

Criar cada arquivo abaixo em `supabase/migrations/` com o nome e conteúdo exatos.
São 5 migrations, devem ser aplicadas nesta ordem (os nomes já garantem isso
por timestamp). Use a ferramenta de migration do Supabase deste projeto para
aplicá-las (`supabase db push` ou equivalente já usado neste repo) — não aplique
à mão fora do fluxo de migration.

### Arquivo: supabase/migrations/20260716090000_schema_ia_obras.sql

```sql
-- Gerado a partir do pacote IA de classificação de obras (ver docs/ai-context/25-ia-classificacao-obras.md)
-- Aplicar via: supabase migration new <nome> (copiar conteúdo) OU supabase db push se já estiver na pasta supabase/migrations/

-- =========================================================
-- BASE DE REFERÊNCIA PADRONIZADA: TIPOS DE OBRA
-- Memória persistente para a IA classificar, planejar fases,
-- gerar checklist e sugerir materiais sem re-perguntar do zero.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Tipo canônico de obra (elimina duplicidade nome/descrição redundante)
CREATE TABLE public.tipos_obra_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,          -- slug: 'residencial'
  nome text NOT NULL,                   -- 'Residencial'
  descricao text NOT NULL,              -- descrição rica, contexto de execução real
  categoria_macro text,                 -- 'edificacao' | 'infraestrutura' | 'manutencao' | 'urbanismo'
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

-- 2) Sinônimos / termos livres que o usuário pode digitar
CREATE TABLE public.tipos_obra_sinonimos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_obra_id uuid NOT NULL REFERENCES public.tipos_obra_padrao(id) ON DELETE CASCADE,
  termo text NOT NULL,                  -- 'obras residenciais', 'construir casa'...
  peso numeric DEFAULT 1.0
);
CREATE INDEX idx_sinonimos_trgm ON public.tipos_obra_sinonimos USING gin (termo gin_trgm_ops);

-- 3) Subtipos / contexto de execução (granularidade fina dentro de um tipo)
--    Ex: dentro de Residencial -> Muro, Ampliação de Cômodo, Troca de Piso, Reforma de Telhado
CREATE TABLE public.subtipos_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_obra_id uuid NOT NULL REFERENCES public.tipos_obra_padrao(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  gatilhos text[]                       -- palavras-chave que disparam esse subtipo na conversa
);
CREATE INDEX idx_subtipos_gatilhos ON public.subtipos_obra USING gin (gatilhos);

-- 4) Fases padrão (por tipo, e opcionalmente refinadas por subtipo)
CREATE TABLE public.fases_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_obra_id uuid NOT NULL REFERENCES public.tipos_obra_padrao(id) ON DELETE CASCADE,
  subtipo_obra_id uuid REFERENCES public.subtipos_obra(id) ON DELETE CASCADE, -- NULL = vale p/ todo o tipo
  nome text NOT NULL,
  ordem int NOT NULL,
  descricao text
);

-- 5) Etapas dentro de cada fase
CREATE TABLE public.etapas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_padrao_id uuid NOT NULL REFERENCES public.fases_padrao(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem int NOT NULL,
  responsavel_sugerido text,            -- 'pedreiro','eletricista','arquiteto','engenheiro civil'...
  duracao_estimada_dias int
);

-- 6) Checklist por etapa
CREATE TABLE public.checklist_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_padrao_id uuid NOT NULL REFERENCES public.etapas_padrao(id) ON DELETE CASCADE,
  item text NOT NULL,
  obrigatorio boolean DEFAULT true,
  ordem int
);

-- 7) Papéis/contratações sugeridas por fase
CREATE TABLE public.contratacoes_sugeridas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_padrao_id uuid NOT NULL REFERENCES public.fases_padrao(id) ON DELETE CASCADE,
  papel text NOT NULL,                  -- 'Pedreiro','Eletricista','Arquiteto'...
  obrigatorio boolean DEFAULT true
);

-- 8) Materiais sugeridos por etapa (granularidade progressiva: genérico -> específico)
CREATE TABLE public.materiais_sugeridos_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_padrao_id uuid NOT NULL REFERENCES public.etapas_padrao(id) ON DELETE CASCADE,
  categoria_produto_id uuid REFERENCES public.categorias_produtos(id),
  produto_id uuid REFERENCES public.produtos(id),   -- NULL = ainda genérico, granulação pendente
  observacao text,
  granularidade text DEFAULT 'generico' CHECK (granularidade IN ('generico','especifico'))
);

-- 9) Memória de classificação: aprende com cada decisão (evita reperguntar / RAG incremental)
CREATE TABLE public.log_classificacao_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termo_usuario text NOT NULL,
  tipo_obra_sugerido_id uuid REFERENCES public.tipos_obra_padrao(id),
  tipo_obra_confirmado_id uuid REFERENCES public.tipos_obra_padrao(id),
  subtipo_confirmado_id uuid REFERENCES public.subtipos_obra(id),
  foi_tipo_novo boolean DEFAULT false,
  score_similaridade numeric,
  criado_em timestamptz DEFAULT now()
);

-- Função de matching fuzzy: termo do usuário -> tipo canônico mais provável
CREATE OR REPLACE FUNCTION public.classificar_tipo_obra(p_termo text)
RETURNS TABLE(tipo_obra_id uuid, nome text, score real) AS $$
  SELECT t.id, t.nome, similarity(s.termo, p_termo) AS score
  FROM public.tipos_obra_sinonimos s
  JOIN public.tipos_obra_padrao t ON t.id = s.tipo_obra_id
  WHERE t.ativo = true
  ORDER BY score DESC
  LIMIT 5;
$$ LANGUAGE sql STABLE;
```

### Arquivo: supabase/migrations/20260716090100_seed_tipos_obra.sql

```sql
-- Gerado a partir do pacote IA de classificação de obras (ver docs/ai-context/25-ia-classificacao-obras.md)
-- Aplicar via: supabase migration new <nome> (copiar conteúdo) OU supabase db push se já estiver na pasta supabase/migrations/

-- Seed: 15 tipos de obra canônicos, descrições reais (não-redundantes) + sinônimos
-- Sinônimos cobrem as variações que já existiam cadastradas (ex: "Obras residenciais")
-- para que nenhuma obra antiga fique órfã na migração.

BEGIN;
SET session_replication_role = replica;

INSERT INTO public.tipos_obra_padrao (codigo, nome, descricao, categoria_macro) VALUES
('acabamento',    'Acabamento',    'Etapa final de revestimento e finalização: pintura, piso, forro, esquadrias, louças e metais.', 'edificacao'),
('ampliacao',     'Ampliação',     'Aumento de área construída em edificação existente: novo cômodo, pavimento ou anexo.', 'edificacao'),
('comercial',     'Comercial',     'Construção ou reforma de imóvel destinado a atividade comercial: loja, escritório, galpão comercial.', 'edificacao'),
('construcao',    'Construção',    'Edificação nova, do zero, sem estrutura preexistente no terreno.', 'edificacao'),
('demolicao',     'Demolição',     'Remoção total ou parcial de estrutura existente, com destinação de entulho.', 'edificacao'),
('industrial',    'Industrial',    'Construção ou adequação de galpão, fábrica ou instalação de uso industrial.', 'edificacao'),
('infraestrutura','Infraestrutura','Obras de base: terraplenagem, drenagem, redes de água/esgoto/energia antes da edificação.', 'infraestrutura'),
('instalacoes',   'Instalações',   'Execução ou reforma de sistemas prediais: elétrica, hidráulica, gás e ar-condicionado.', 'edificacao'),
('manutencao',    'Manutenção',    'Serviços de manutenção preventiva ou corretiva em estrutura já existente e em uso.', 'manutencao'),
('paisagismo',    'Paisagismo',    'Criação ou reforma de jardins, áreas verdes e externas, incluindo irrigação e iluminação de jardim.', 'urbanismo'),
('predial',       'Predial',       'Obras em áreas comuns de condomínios e edifícios: fachada, telhado coletivo, hall, elevador.', 'edificacao'),
('reforma',       'Reforma',       'Alteração ou modernização de edificação existente sem necessariamente aumentar a área construída.', 'edificacao'),
('regularizacao', 'Regularização', 'Adequação documental e técnica de imóvel para averbação, habite-se ou legalização junto à prefeitura.', 'documental'),
('residencial',   'Residencial',   'Construção, reforma ou ampliação de imóvel de uso residencial: casa, sobrado ou apartamento.', 'edificacao'),
('urbanizacao',   'Urbanização',   'Obras públicas ou de loteamento: praças, vias, calçadas e infraestrutura de bairro.', 'infraestrutura');

-- Sinônimos (inclui os textos originais redundantes já cadastrados no sistema)
INSERT INTO public.tipos_obra_sinonimos (tipo_obra_id, termo)
SELECT id, termo FROM public.tipos_obra_padrao t
JOIN (VALUES
  ('acabamento','obras de acabamento'),('acabamento','acabamento final'),
  ('ampliacao','ampliação de edificações'),('ampliacao','aumentar a casa'),('ampliacao','construir um cômodo'),('ampliacao','ampliação de cômodo'),
  ('comercial','obras comerciais'),('comercial','loja'),('comercial','escritório'),
  ('construcao','qualquer tipo de construção'),('construcao','construção nova'),('construcao','construir do zero'),
  ('demolicao','obras de demolição'),('demolicao','demolir'),
  ('industrial','obras industriais'),('industrial','galpão industrial'),
  ('infraestrutura','obras de infraestrutura'),('infraestrutura','terraplenagem'),
  ('instalacoes','elétrica, hidráulica e gás'),('instalacoes','instalação elétrica'),('instalacoes','instalação hidráulica'),
  ('manutencao','manutenção preventiva e corretiva'),('manutencao','conserto'),('manutencao','reparo'),
  ('paisagismo','jardins e áreas externas'),('paisagismo','jardim'),('paisagismo','paisagismo externo'),
  ('predial','condomínios e edifícios'),('predial','área comum'),('predial','fachada do prédio'),
  ('reforma','reformas em geral'),('reforma','reformar'),('reforma','trocar piso'),('reforma','trocar telhado'),('reforma','reforma de telhado'),
  ('regularizacao','regularização de imóveis'),('regularizacao','legalizar imóvel'),('regularizacao','averbação'),
  ('residencial','obras residenciais'),('residencial','construir casa'),('residencial','reforma de casa'),('residencial','construir muro'),
  ('urbanizacao','praças, ruas e loteamentos'),('urbanizacao','loteamento'),('urbanizacao','via pública')
) AS s(codigo, termo) ON s.codigo = t.codigo;

SET session_replication_role = DEFAULT;
COMMIT;
```

### Arquivo: supabase/migrations/20260716090200_seed_residencial_completo.sql

```sql
-- Gerado a partir do pacote IA de classificação de obras (ver docs/ai-context/25-ia-classificacao-obras.md)
-- Aplicar via: supabase migration new <nome> (copiar conteúdo) OU supabase db push se já estiver na pasta supabase/migrations/

-- Exemplo completo: RESIDENCIAL
-- Fases genéricas (valem pra qualquer obra residencial) + 2 subtipos com fases próprias.
-- Serve de modelo/template para os outros 14 tipos (Fase 2 do plano).

BEGIN;
SET session_replication_role = replica;

-- Subtipos de Residencial
INSERT INTO public.subtipos_obra (id, tipo_obra_id, nome, descricao, gatilhos)
SELECT gen_random_uuid(), t.id, s.nome, s.descricao, s.gatilhos
FROM public.tipos_obra_padrao t,
(VALUES
  ('Construção de Muro', 'Levantamento de muro divisório ou de fechamento de terreno.', ARRAY['muro','muralha','fechamento de terreno']),
  ('Ampliação de Cômodo', 'Aumento de área construída adicionando ou expandindo cômodo.', ARRAY['ampliar comodo','novo quarto','aumentar casa','puxadinho']),
  ('Troca de Piso', 'Remoção do piso existente e instalação de novo revestimento.', ARRAY['trocar piso','revestimento novo','piso porcelanato']),
  ('Reforma de Telhado', 'Reforma, reparo ou ampliação de estrutura e cobertura de telhado.', ARRAY['telhado','cobertura','goteira','trocar telha']),
  ('Pintura Residencial', 'Pintura interna e/ou externa de imóvel residencial.', ARRAY['pintura','pintar casa','repintura'])
) AS s(nome, descricao, gatilhos)
WHERE t.codigo = 'residencial';

-- ================= FASES GENÉRICAS (subtipo_obra_id = NULL, vale p/ todo Residencial) =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'residencial')
INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao
FROM t, (VALUES
  ('Planejamento e Orçamento', 1, 'Definição de escopo, orçamento e cronograma inicial.'),
  ('Documentação e Aprovação', 2, 'Projeto, ART/RRT e aprovação na prefeitura quando aplicável.'),
  ('Fundação e Estrutura', 3, 'Execução de fundação, pilares, vigas e laje.'),
  ('Alvenaria', 4, 'Levantamento de paredes e vedações.'),
  ('Instalações', 5, 'Elétrica, hidráulica e, se houver, gás.'),
  ('Acabamento', 6, 'Reboco, pintura, piso, forro e esquadrias.'),
  ('Entrega e Vistoria', 7, 'Limpeza pós-obra, vistoria final e entrega ao cliente.')
) AS f(nome, ordem, descricao);

-- Etapas + checklist da fase "Fundação e Estrutura" (exemplo de granularidade)
WITH fase AS (
  SELECT fp.id FROM public.fases_padrao fp
  JOIN public.tipos_obra_padrao t ON t.id = fp.tipo_obra_id
  WHERE t.codigo = 'residencial' AND fp.subtipo_obra_id IS NULL AND fp.nome = 'Fundação e Estrutura'
),
etapa_ins AS (
  INSERT INTO public.etapas_padrao (id, fase_padrao_id, nome, ordem, responsavel_sugerido, duracao_estimada_dias)
  SELECT gen_random_uuid(), fase.id, e.nome, e.ordem, e.responsavel, e.dias
  FROM fase, (VALUES
    ('Locação da obra', 1, 'Engenheiro Civil', 1),
    ('Escavação e sapatas', 2, 'Pedreiro', 5),
    ('Armação e concretagem', 3, 'Armador / Pedreiro', 7),
    ('Cura do concreto', 4, NULL, 7)
  ) AS e(nome, ordem, responsavel, dias)
  RETURNING id, nome
)
INSERT INTO public.checklist_padrao (id, etapa_padrao_id, item, obrigatorio, ordem)
SELECT gen_random_uuid(), e.id, c.item, true, c.ordem
FROM etapa_ins e
JOIN (VALUES
  ('Locação da obra', 1, 'Conferir alinhamento com projeto aprovado'),
  ('Locação da obra', 2, 'Verificar afastamentos legais'),
  ('Escavação e sapatas', 1, 'Verificar profundidade mínima de projeto'),
  ('Escavação e sapatas', 2, 'Checar solo (ausência de entulho/água)'),
  ('Armação e concretagem', 1, 'Conferir bitola e espaçamento das ferragens'),
  ('Armação e concretagem', 2, 'Validar traço do concreto (fck)'),
  ('Cura do concreto', 1, 'Manter cura úmida por no mínimo 7 dias')
) AS c(etapa_nome, ordem, item) ON c.etapa_nome = e.nome;

-- Contratações sugeridas por fase
WITH fase AS (
  SELECT fp.id, fp.nome FROM public.fases_padrao fp
  JOIN public.tipos_obra_padrao t ON t.id = fp.tipo_obra_id
  WHERE t.codigo = 'residencial' AND fp.subtipo_obra_id IS NULL
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase.id, c.papel, c.obrigatorio
FROM fase
JOIN (VALUES
  ('Planejamento e Orçamento', 'Arquiteto', true),
  ('Documentação e Aprovação', 'Engenheiro Civil (ART/RRT)', true),
  ('Fundação e Estrutura', 'Mestre de Obras', true),
  ('Fundação e Estrutura', 'Armador', true),
  ('Alvenaria', 'Pedreiro', true),
  ('Instalações', 'Eletricista', true),
  ('Instalações', 'Encanador', true),
  ('Acabamento', 'Pintor', true),
  ('Acabamento', 'Azulejista', false)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase.nome;

-- ================= SUBTIPO: Construção de Muro (fases próprias, mais enxutas) =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'residencial'),
sub AS (SELECT id FROM public.subtipos_obra WHERE nome = 'Construção de Muro' AND tipo_obra_id = (SELECT id FROM t)),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, sub.id, f.nome, f.ordem, f.descricao
  FROM t, sub, (VALUES
    ('Marcação e Fundação Rasa', 1, 'Locação do muro e execução de baldrame/sapata corrida.'),
    ('Levantamento de Alvenaria', 2, 'Elevação do muro em blocos/tijolos.'),
    ('Acabamento e Pintura', 3, 'Reboco, chapisco e pintura do muro.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
),
etapa_ins AS (
  INSERT INTO public.etapas_padrao (id, fase_padrao_id, nome, ordem, responsavel_sugerido, duracao_estimada_dias)
  SELECT gen_random_uuid(), fase_ins.id, e.nome, e.ordem, e.responsavel, e.dias
  FROM fase_ins
  JOIN (VALUES
    ('Marcação e Fundação Rasa', 'Escavação da sapata corrida', 1, 'Pedreiro', 2),
    ('Marcação e Fundação Rasa', 'Concretagem do baldrame', 2, 'Pedreiro', 2),
    ('Levantamento de Alvenaria', 'Assentamento de blocos', 1, 'Pedreiro', 4),
    ('Acabamento e Pintura', 'Chapisco e reboco', 1, 'Pedreiro', 3),
    ('Acabamento e Pintura', 'Pintura final', 2, 'Pintor', 2)
  ) AS e(fase_nome, nome, ordem, responsavel, dias) ON e.fase_nome = fase_ins.nome
  RETURNING id, nome
)
INSERT INTO public.checklist_padrao (id, etapa_padrao_id, item, obrigatorio, ordem)
SELECT gen_random_uuid(), etapa_ins.id, c.item, true, c.ordem
FROM etapa_ins
JOIN (VALUES
  ('Escavação da sapata corrida', 1, 'Conferir profundidade mínima (30-40cm)'),
  ('Concretagem do baldrame', 1, 'Verificar nível e prumo'),
  ('Assentamento de blocos', 1, 'Checar esquadro e prumo a cada 3 fiadas'),
  ('Chapisco e reboco', 1, 'Aguardar cura mínima antes de rebocar'),
  ('Pintura final', 1, 'Aplicar fundo selador antes da tinta')
) AS c(etapa_nome, ordem, item) ON c.etapa_nome = etapa_ins.nome;

-- Materiais genéricos por categoria (granulação específica fica pra Fase 3, quando
-- o usuário detalhar medidas/marca/quantidade real da obra)
WITH etapa AS (
  SELECT ep.id, ep.nome FROM public.etapas_padrao ep
  JOIN public.fases_padrao fp ON fp.id = ep.fase_padrao_id
  JOIN public.subtipos_obra st ON st.id = fp.subtipo_obra_id
  WHERE st.nome = 'Construção de Muro'
),
cat AS (SELECT id, nome FROM public.categorias_produtos)
INSERT INTO public.materiais_sugeridos_padrao (id, etapa_padrao_id, categoria_produto_id, observacao, granularidade)
SELECT gen_random_uuid(), etapa.id, cat.id, m.observacao, 'generico'
FROM etapa
JOIN (VALUES
  ('Escavação da sapata corrida', 'Agregados', 'Areia e brita para concreto'),
  ('Concretagem do baldrame', 'Cimento e Argamassa', 'Cimento CP II para o traço do concreto'),
  ('Concretagem do baldrame', 'Blocos e Estrutura', 'Vergalhão para armação do baldrame'),
  ('Assentamento de blocos', 'Blocos e Estrutura', 'Bloco de concreto conforme espessura do muro'),
  ('Chapisco e reboco', 'Cimento e Argamassa', 'Argamassa de assentamento/reboco'),
  ('Pintura final', 'Pintura', 'Selador + tinta acrílica')
) AS m(etapa_nome, categoria_nome, observacao) ON m.etapa_nome = etapa.nome
JOIN cat ON cat.nome = m.categoria_nome;

SET session_replication_role = DEFAULT;
COMMIT;
```

### Arquivo: supabase/migrations/20260716090300_schema_integracao_real.sql

```sql
-- Gerado a partir do pacote IA de classificação de obras (ver docs/ai-context/25-ia-classificacao-obras.md)
-- Aplicar via: supabase migration new <nome> (copiar conteúdo) OU supabase db push se já estiver na pasta supabase/migrations/

-- =========================================================
-- INTEGRAÇÃO COM SCHEMA REAL + CORREÇÕES DE ACOPLAMENTO
-- Resolve os 3 pontos em aberto antes de escalar pros 14 tipos:
--  1) rastreabilidade template -> execução real (obra_fases/fase_itens)
--  2) materiais_sugeridos_padrao não pode apontar pra produto_id
--     de tabela por-tenant (produtos.user_id NOT NULL)
--  3) migração dos dados legados (obras.tipo_obra texto solto)
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1) Rastreabilidade: obra_fases e fase_itens ganham FK opcional
--    pro template de origem. Nullable pq obra pode ter fase manual
--    (usuário criou fora do fluxo do orquestrador).
-- ---------------------------------------------------------
ALTER TABLE public.obra_fases
  ADD COLUMN fase_padrao_id uuid REFERENCES public.fases_padrao(id) ON DELETE SET NULL;

ALTER TABLE public.fase_itens
  ADD COLUMN etapa_padrao_id uuid REFERENCES public.etapas_padrao(id) ON DELETE SET NULL;

-- Checklist real da etapa. Hoje fase_itens é uma lista plana (nome/status/valor),
-- sem estrutura pra guardar os itens de checklist_padrao instanciados.
-- Cria tabela nova em vez de forçar checklist dentro de fase_itens.nome (texto solto).
CREATE TABLE public.fase_item_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_item_id uuid NOT NULL REFERENCES public.fase_itens(id) ON DELETE CASCADE,
  checklist_padrao_id uuid REFERENCES public.checklist_padrao(id) ON DELETE SET NULL, -- NULL = item avulso adicionado manualmente
  item text NOT NULL,
  obrigatorio boolean DEFAULT true,
  concluido boolean DEFAULT false,
  concluido_em timestamptz,
  tenant_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_fase_item_checklist_item ON public.fase_item_checklist(fase_item_id);

-- Índice pra achar rápido quais obra_fases vieram de qual fase_padrao (analytics/reuso)
CREATE INDEX idx_obra_fases_padrao ON public.obra_fases(fase_padrao_id);
CREATE INDEX idx_fase_itens_etapa_padrao ON public.fase_itens(etapa_padrao_id);

-- ---------------------------------------------------------
-- 2) materiais_sugeridos_padrao: remove o acoplamento com produtos
--    (tabela por-tenant, user_id NOT NULL — um template global
--    jamais pode fixar produto_id de um usuário específico).
--    Templates ficam SEMPRE no nível de categoria.
--    Sugestão de produto específico (marca, SKU) vira responsabilidade
--    de uma tabela por-tenant à parte, curada com o uso (Fase 3 real).
-- ---------------------------------------------------------
ALTER TABLE public.materiais_sugeridos_padrao
  DROP COLUMN produto_id;

ALTER TABLE public.materiais_sugeridos_padrao
  DROP CONSTRAINT IF EXISTS materiais_sugeridos_padrao_granularidade_check;

ALTER TABLE public.materiais_sugeridos_padrao
  ADD CONSTRAINT materiais_sugeridos_padrao_granularidade_check
  CHECK (granularidade IN ('generico')); -- só existe 'generico' agora; 'especifico' migra pra tabela abaixo

-- Curadoria por-tenant: quando um usuário aceita repetidamente um produto
-- específico pra uma etapa_padrao, isso vira uma linha aqui (aprendizado local,
-- não polui o template global de outros tenants).
CREATE TABLE public.materiais_sugeridos_tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  etapa_padrao_id uuid NOT NULL REFERENCES public.etapas_padrao(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  vezes_aceito int DEFAULT 1,
  criado_em timestamptz DEFAULT now(),
  UNIQUE(tenant_id, etapa_padrao_id, produto_id)
);

-- ---------------------------------------------------------
-- 3) Migração de dados legados: obras.tipo_obra (text solto) -> tipos_obra_padrao
--    Usa a função classificar_tipo_obra (pg_trgm) pra achar o match mais provável.
--    Só preenche automaticamente quando score >= 0.8 (mesma régua do orquestrador);
--    abaixo disso fica pendente de revisão manual em vez de errar silenciosamente.
-- ---------------------------------------------------------
ALTER TABLE public.obras
  ADD COLUMN tipo_obra_padrao_id uuid REFERENCES public.tipos_obra_padrao(id),
  ADD COLUMN migracao_tipo_pendente boolean DEFAULT false;

WITH match AS (
  SELECT o.id AS obra_id, c.tipo_obra_id, c.score,
         ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY c.score DESC) AS rn
  FROM public.obras o
  CROSS JOIN LATERAL public.classificar_tipo_obra(o.tipo_obra) c
  WHERE o.tipo_obra IS NOT NULL
)
UPDATE public.obras o
SET tipo_obra_padrao_id = m.tipo_obra_id
FROM match m
WHERE m.obra_id = o.id AND m.rn = 1 AND m.score >= 0.8;

-- Obras que não bateram com confiança suficiente: sinaliza pra revisão manual
-- em vez de deixar tipo_obra_padrao_id NULL sem explicação.
UPDATE public.obras
SET migracao_tipo_pendente = true
WHERE tipo_obra IS NOT NULL AND tipo_obra_padrao_id IS NULL;

-- Log de auditoria da migração automática (mesma tabela de aprendizado already existente)
INSERT INTO public.log_classificacao_obra (termo_usuario, tipo_obra_sugerido_id, tipo_obra_confirmado_id, score_similaridade)
SELECT o.tipo_obra, o.tipo_obra_padrao_id, o.tipo_obra_padrao_id, 1.0
FROM public.obras o
WHERE o.tipo_obra_padrao_id IS NOT NULL;

COMMIT;

-- Query de apoio pra revisar manualmente as obras que ficaram pendentes:
-- SELECT id, nome, tipo_obra FROM public.obras WHERE migracao_tipo_pendente = true;
```

### Arquivo: supabase/migrations/20260716090400_seed_14_tipos_restantes.sql

```sql
-- Gerado a partir do pacote IA de classificação de obras (ver docs/ai-context/25-ia-classificacao-obras.md)
-- Aplicar via: supabase migration new <nome> (copiar conteúdo) OU supabase db push se já estiver na pasta supabase/migrations/

-- =========================================================
-- FASES GENÉRICAS + CONTRATAÇÕES SUGERIDAS
-- Para os 14 tipos restantes (Residencial já populado em 03_seed_residencial_completo.sql).
-- Granularidade: fases + contratações por fase (nível "tipo", subtipo_obra_id = NULL).
-- Etapas/checklist detalhados por subtipo seguem o mesmo padrão do exemplo Residencial
-- e podem ser adicionados incrementalmente por tipo, conforme demanda real de uso.
-- =========================================================

BEGIN;
SET session_replication_role = replica;

-- Função auxiliar inline: insere fases de um tipo e devolve pra usar em contratações
-- (repetido por bloco pra manter cada tipo independente/re-executável)

-- ================= ACABAMENTO =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'acabamento'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Vistoria e Planejamento', 1, 'Levantamento do estado atual e definição de materiais/cores.'),
    ('Preparo de Superfície', 2, 'Regularização de paredes, piso e teto para receber acabamento.'),
    ('Revestimentos', 3, 'Aplicação de piso, azulejo, forro e esquadrias.'),
    ('Pintura', 4, 'Pintura de paredes, teto e esquadrias.'),
    ('Louças, Metais e Detalhes', 5, 'Instalação de louças, metais e acabamentos finais.'),
    ('Limpeza e Entrega', 6, 'Limpeza pós-obra e vistoria final.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Preparo de Superfície','Pedreiro',true),
  ('Revestimentos','Azulejista',true),
  ('Pintura','Pintor',true),
  ('Louças, Metais e Detalhes','Encanador',false)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= AMPLIAÇÃO =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'ampliacao'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Projeto e Viabilidade', 1, 'Projeto arquitetônico da ampliação e verificação de recuos/limites do terreno.'),
    ('Aprovação Municipal', 2, 'ART/RRT e aprovação de acréscimo de área na prefeitura.'),
    ('Fundação da Nova Área', 3, 'Fundação compatível com a estrutura existente.'),
    ('Estrutura e Alvenaria', 4, 'Pilares, vigas, laje e vedação da área nova.'),
    ('Integração com Estrutura Existente', 5, 'Amarração, impermeabilização e transição com a construção original.'),
    ('Instalações', 6, 'Elétrica e hidráulica da nova área.'),
    ('Acabamento e Entrega', 7, 'Revestimentos, pintura e vistoria final.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Projeto e Viabilidade','Arquiteto',true),
  ('Aprovação Municipal','Engenheiro Civil (ART/RRT)',true),
  ('Fundação da Nova Área','Mestre de Obras',true),
  ('Estrutura e Alvenaria','Pedreiro',true),
  ('Instalações','Eletricista',true),
  ('Instalações','Encanador',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= COMERCIAL =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'comercial'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Projeto e Layout Comercial', 1, 'Projeto de arquitetura e leiaute adequado à operação do negócio.'),
    ('Documentação e Licenças', 2, 'Alvará, ART/RRT, laudo de bombeiro (AVCB) quando aplicável.'),
    ('Estrutura e Alvenaria', 3, 'Fundação, estrutura e vedações.'),
    ('Instalações Comerciais', 4, 'Elétrica, hidráulica, ar-condicionado e infraestrutura de dados.'),
    ('Acabamento e Identidade Visual', 5, 'Revestimentos, pintura, fachada e comunicação visual.'),
    ('Entrega e Vistoria', 6, 'Vistoria final, testes de instalações e entrega.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Projeto e Layout Comercial','Arquiteto',true),
  ('Documentação e Licenças','Engenheiro Civil (ART/RRT)',true),
  ('Estrutura e Alvenaria','Mestre de Obras',true),
  ('Instalações Comerciais','Eletricista',true),
  ('Instalações Comerciais','Encanador',true),
  ('Acabamento e Identidade Visual','Pintor',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= CONSTRUÇÃO =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'construcao'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Projeto e Orçamento', 1, 'Projeto arquitetônico/estrutural e orçamento completo da obra.'),
    ('Documentação e Aprovação', 2, 'ART/RRT, alvará de construção junto à prefeitura.'),
    ('Terraplenagem e Fundação', 3, 'Preparo do terreno e execução da fundação.'),
    ('Estrutura', 4, 'Pilares, vigas e lajes.'),
    ('Alvenaria e Vedações', 5, 'Levantamento de paredes internas e externas.'),
    ('Instalações', 6, 'Elétrica, hidráulica e gás.'),
    ('Acabamento', 7, 'Revestimentos, pintura, piso e esquadrias.'),
    ('Entrega e Habite-se', 8, 'Vistoria final e emissão de habite-se.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Projeto e Orçamento','Arquiteto',true),
  ('Documentação e Aprovação','Engenheiro Civil (ART/RRT)',true),
  ('Terraplenagem e Fundação','Mestre de Obras',true),
  ('Estrutura','Armador',true),
  ('Alvenaria e Vedações','Pedreiro',true),
  ('Instalações','Eletricista',true),
  ('Instalações','Encanador',true),
  ('Acabamento','Pintor',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= DEMOLIÇÃO =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'demolicao'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Laudo e Licença de Demolição', 1, 'Laudo técnico e autorização junto à prefeitura quando exigido.'),
    ('Isolamento e Desligamentos', 2, 'Isolamento da área e desligamento de energia/água/gás.'),
    ('Demolição', 3, 'Execução da demolição total ou parcial da estrutura.'),
    ('Remoção de Entulho', 4, 'Carregamento e destinação correta do entulho (caçambas/aterro licenciado).'),
    ('Limpeza do Terreno', 5, 'Limpeza final e nivelamento do terreno.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Laudo e Licença de Demolição','Engenheiro Civil (ART/RRT)',true),
  ('Demolição','Mestre de Obras',true),
  ('Remoção de Entulho','Empresa de Caçambas',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= INDUSTRIAL =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'industrial'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Projeto Industrial e Licenciamento', 1, 'Projeto estrutural/industrial e licenças ambientais quando aplicável.'),
    ('Terraplenagem e Fundação', 2, 'Preparo do terreno e fundação para grandes cargas/estrutura metálica.'),
    ('Estrutura Metálica ou Pré-moldada', 3, 'Montagem da estrutura do galpão.'),
    ('Cobertura e Vedações', 4, 'Telhamento e fechamento lateral.'),
    ('Instalações Industriais', 5, 'Elétrica de força, hidráulica e sistemas de combate a incêndio.'),
    ('Piso Industrial', 6, 'Execução de piso de concreto de alta resistência.'),
    ('Entrega e Testes', 7, 'Testes de instalações e vistoria final.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Projeto Industrial e Licenciamento','Engenheiro Civil (ART/RRT)',true),
  ('Estrutura Metálica ou Pré-moldada','Montador de Estrutura Metálica',true),
  ('Instalações Industriais','Eletricista Industrial',true),
  ('Piso Industrial','Empreiteira de Piso Industrial',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= INFRAESTRUTURA =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'infraestrutura'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Levantamento Topográfico', 1, 'Levantamento do terreno e definição de cotas/níveis.'),
    ('Terraplenagem', 2, 'Corte, aterro e compactação do solo.'),
    ('Drenagem', 3, 'Execução de sistema de drenagem pluvial.'),
    ('Redes de Água e Esgoto', 4, 'Instalação de tubulações de água e esgoto.'),
    ('Redes de Energia', 5, 'Infraestrutura elétrica subterrânea ou aérea.'),
    ('Pavimentação', 6, 'Base e revestimento asfáltico ou de outro tipo, se aplicável.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Levantamento Topográfico','Topógrafo',true),
  ('Terraplenagem','Engenheiro Civil (ART/RRT)',true),
  ('Drenagem','Empreiteira de Infraestrutura',true),
  ('Redes de Energia','Eletricista Industrial',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= INSTALAÇÕES =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'instalacoes'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Diagnóstico e Projeto', 1, 'Levantamento do sistema atual e projeto das instalações novas.'),
    ('Abertura de Rasgos/Infraestrutura', 2, 'Abertura de paredes/piso para passagem de tubulação e fiação.'),
    ('Execução Elétrica', 3, 'Passagem de fiação, quadro e pontos elétricos.'),
    ('Execução Hidráulica', 4, 'Tubulação de água fria/quente e esgoto.'),
    ('Execução de Gás e Ar-condicionado', 5, 'Instalação de gás encanado e/ou climatização, quando aplicável.'),
    ('Testes e Fechamento', 6, 'Testes de pressão/continuidade e fechamento de rasgos.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Execução Elétrica','Eletricista',true),
  ('Execução Hidráulica','Encanador',true),
  ('Execução de Gás e Ar-condicionado','Técnico de Ar-condicionado',false),
  ('Testes e Fechamento','Pedreiro',false)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= MANUTENÇÃO =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'manutencao'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Diagnóstico do Problema', 1, 'Identificação da causa e extensão do reparo necessário.'),
    ('Orçamento e Peças', 2, 'Levantamento de material/peças necessárias.'),
    ('Execução do Reparo', 3, 'Correção do problema identificado.'),
    ('Teste e Verificação', 4, 'Confirmação de que o problema foi resolvido.'),
    ('Limpeza e Entrega', 5, 'Limpeza do local e entrega ao cliente.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Execução do Reparo','Técnico/Profissional Especializado',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= PAISAGISMO =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'paisagismo'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Projeto Paisagístico', 1, 'Definição de espécies, layout e sistema de irrigação.'),
    ('Preparo do Solo', 2, 'Limpeza, nivelamento e correção do solo.'),
    ('Irrigação e Drenagem', 3, 'Instalação de sistema de irrigação e drenagem do jardim.'),
    ('Plantio', 4, 'Plantio de grama, arbustos e árvores.'),
    ('Iluminação e Acabamentos', 5, 'Iluminação externa, caminhos e elementos decorativos.'),
    ('Manutenção Inicial', 6, 'Acompanhamento de pega das plantas nas primeiras semanas.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Projeto Paisagístico','Paisagista',true),
  ('Irrigação e Drenagem','Instalador de Irrigação',true),
  ('Plantio','Jardineiro',true),
  ('Iluminação e Acabamentos','Eletricista',false)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= PREDIAL =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'predial'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Aprovação em Assembleia', 1, 'Aprovação do serviço junto ao condomínio/síndico.'),
    ('Projeto e Orçamento', 2, 'Projeto técnico e orçamento da intervenção em área comum.'),
    ('Isolamento da Área', 3, 'Sinalização e isolamento de segurança da área comum afetada.'),
    ('Execução', 4, 'Execução do serviço (fachada, telhado coletivo, hall, elevador etc).'),
    ('Vistoria e Entrega', 5, 'Vistoria técnica e entrega formal ao síndico.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Projeto e Orçamento','Engenheiro Civil (ART/RRT)',true),
  ('Execução','Mestre de Obras',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= REFORMA =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'reforma'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Vistoria e Escopo', 1, 'Levantamento do que será alterado e definição de escopo.'),
    ('Demolição Parcial', 2, 'Remoção do que será substituído (piso, revestimento, paredes não estruturais).'),
    ('Estrutura e Alvenaria', 3, 'Ajustes estruturais e de alvenaria quando necessário.'),
    ('Instalações', 4, 'Atualização de elétrica/hidráulica conforme o escopo.'),
    ('Acabamento', 5, 'Revestimentos, pintura e finalizações.'),
    ('Limpeza e Entrega', 6, 'Limpeza pós-obra e vistoria final.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Vistoria e Escopo','Arquiteto',false),
  ('Demolição Parcial','Pedreiro',true),
  ('Instalações','Eletricista',false),
  ('Instalações','Encanador',false),
  ('Acabamento','Pintor',true)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= REGULARIZAÇÃO =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'regularizacao'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Levantamento da Situação Atual', 1, 'Verificação do que está construído vs. o que está aprovado/registrado.'),
    ('Elaboração de Projeto As-Built', 2, 'Projeto que representa a construção real existente.'),
    ('ART/RRT e Documentação Técnica', 3, 'Emissão de responsabilidade técnica para o processo.'),
    ('Protocolo na Prefeitura', 4, 'Entrada do processo de regularização/habite-se.'),
    ('Acompanhamento do Processo', 5, 'Atendimento a exigências do órgão até aprovação.'),
    ('Averbação em Cartório', 6, 'Registro final da regularização no cartório de imóveis.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Elaboração de Projeto As-Built','Arquiteto',true),
  ('ART/RRT e Documentação Técnica','Engenheiro Civil (ART/RRT)',true),
  ('Averbação em Cartório','Despachante/Advogado',false)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

-- ================= URBANIZAÇÃO =================
WITH t AS (SELECT id FROM public.tipos_obra_padrao WHERE codigo = 'urbanizacao'),
fase_ins AS (
  INSERT INTO public.fases_padrao (id, tipo_obra_id, subtipo_obra_id, nome, ordem, descricao)
  SELECT gen_random_uuid(), t.id, NULL, f.nome, f.ordem, f.descricao FROM t, (VALUES
    ('Projeto Urbanístico', 1, 'Projeto de vias, praças, calçadas e loteamento.'),
    ('Licenciamento Público', 2, 'Aprovação junto a órgãos municipais/estaduais competentes.'),
    ('Terraplenagem e Infraestrutura', 3, 'Terraplenagem e redes de água/esgoto/energia da área.'),
    ('Pavimentação e Calçadas', 4, 'Execução de vias, calçadas e acessibilidade.'),
    ('Paisagismo Urbano e Mobiliário', 5, 'Áreas verdes, praças e mobiliário urbano.'),
    ('Entrega ao Poder Público', 6, 'Vistoria e entrega formal da obra pública/loteamento.')
  ) AS f(nome, ordem, descricao)
  RETURNING id, nome
)
INSERT INTO public.contratacoes_sugeridas (id, fase_padrao_id, papel, obrigatorio)
SELECT gen_random_uuid(), fase_ins.id, c.papel, c.obrigatorio FROM fase_ins
JOIN (VALUES
  ('Projeto Urbanístico','Engenheiro Civil (ART/RRT)',true),
  ('Terraplenagem e Infraestrutura','Empreiteira de Infraestrutura',true),
  ('Pavimentação e Calçadas','Empreiteira de Pavimentação',true),
  ('Paisagismo Urbano e Mobiliário','Paisagista',false)
) AS c(fase_nome, papel, obrigatorio) ON c.fase_nome = fase_ins.nome;

SET session_replication_role = DEFAULT;
COMMIT;
```

## Passo 3 — Criar o arquivo de documentação de arquitetura

### Arquivo: docs/ai-context/25-ia-classificacao-obras.md

```markdown
# 25 — IA: Classificação, Planejamento de Fases e Materiais de Obra

Complementa `docs/ai-context/19-ai-development-rules.md`. Regras específicas do
subsistema de IA que classifica tipo de obra, monta fases/etapas, gera checklist
e sugere materiais. Skills dos agentes ficam em `docs/ai-agents/` (ou onde o
projeto padronizar skills `.md` — ver `orquestrador.md`, `agente-classificador.md`,
`agente-planejador-fases.md`, `agente-checklist.md`, `agente-materiais.md`).

## O que é

Camada de "memória padronizada" pra IA não reperguntar do zero a cada obra nova:
tabelas `*_padrao` (globais, sem `tenant_id`) guardam tipo canônico de obra,
sinônimos, subtipos, fases, etapas, checklist e materiais sugeridos por categoria.
O `orquestrador-obras` é o único ponto de entrada que aciona os agentes em sequência
(classificador → planejador de fases → checklist → materiais).

## Migrations relacionadas (ordem de aplicação)

Todas via ferramenta de migration do Supabase — nunca SQL à mão, conforme
`16-coding-rules.md`. Se ainda não aplicadas neste projeto, aplicar nesta ordem:

1. `01_schema_ia_obras.sql` — tabelas `tipos_obra_padrao`, `tipos_obra_sinonimos`,
   `subtipos_obra`, `fases_padrao`, `etapas_padrao`, `checklist_padrao`,
   `contratacoes_sugeridas`, `materiais_sugeridos_padrao`, `log_classificacao_obra`
   + função `classificar_tipo_obra()` (pg_trgm).
2. `02_seed_tipos_obra.sql` — 15 tipos canônicos + sinônimos.
3. `03_seed_residencial_completo.sql` — exemplo completo (fases genéricas + subtipo
   "Construção de Muro" com etapas/checklist/materiais). É o template de
   granularidade a seguir pros demais tipos/subtipos.
4. `04_schema_integracao_real.sql` — liga os templates às tabelas reais existentes
   (`obras`, `obra_fases`, `fase_itens`), corrige `materiais_sugeridos_padrao` pra
   nunca referenciar `produtos` diretamente, cria `materiais_sugeridos_tenant`
   (curadoria por tenant) e migra `obras.tipo_obra` (texto legado) para
   `tipo_obra_padrao_id`.
5. `05_seed_14_tipos_restantes.sql` — fases genéricas + contratações dos outros 14
   tipos (sem etapas/checklist detalhados ainda — ver pendências).

**Antes de aplicar `04` e `05` neste projeto**, confirmar se `01`-`03` já foram
aplicados (checar existência das tabelas `tipos_obra_padrao` etc). Se este projeto
já tem uma versão própria dessas tabelas com nomes diferentes, mapear antes de
rodar — não assumir que o schema está vazio.

## Regras vinculantes (somam-se às de `19-ai-development-rules.md`)

- Tabela `*_padrao` é sempre global: **nunca** adicionar `user_id`/`tenant_id` nela.
  É catálogo compartilhado entre tenants.
- `materiais_sugeridos_padrao` **nunca** referencia `produtos.id` diretamente —
  `produtos` é por-tenant (`user_id NOT NULL`); um template global não pode fixar
  produto de um usuário específico. Fica só em `categoria_produto_id`. Sugestão de
  produto específico por tenant vai em `materiais_sugeridos_tenant`.
- `fases_padrao.subtipo_obra_id = NULL` → fase genérica (vale pro tipo inteiro).
  Quando o subtipo tem fase equivalente mais específica, ela **substitui** a
  genérica no planejamento — nunca soma as duas (regra do `agente-planejador-fases`).
- Cascata: `_padrao` → filhos usa `ON DELETE CASCADE`. Referência de execução real
  (`obra_fases`, `fase_itens`) pro template usa `ON DELETE SET NULL` — apagar um
  template nunca pode apagar dado real de obra de cliente.
- Todo `INSERT` de seed usa `gen_random_uuid()`, nunca UUID fixo, e resolve o pai
  por `codigo`/`nome` (`WHERE t.codigo = 'x'`), nunca por ID hardcoded.
- Seeds não são idempotentes em escrita (rodar duas vezes duplica linhas). Antes de
  aplicar seed novo pra um tipo/subtipo, checar com `SELECT` se já existe conteúdo
  cadastrado pra ele.
- FK de RLS: como de praxe no projeto, toda tabela nova leva GRANT+RLS junto da
  migration de CREATE TABLE (`19-ai-development-rules.md`) — as tabelas `*_padrao`
  são globais mas ainda precisam de policy de leitura (ex: `SELECT` liberado pra
  qualquer usuário autenticado, sem policy de tenant já que não têm `tenant_id`).

## Estado de cobertura por tipo (atualizar isso quando granularizar um tipo novo)

| Tipo | Fases genéricas | Subtipos | Etapas + Checklist detalhado |
|---|---|---|---|
| Residencial | ✅ | ✅ (5 subtipos c/ gatilhos) | ✅ só "Construção de Muro" |
| Demais 14 tipos | ✅ | ❌ | ❌ só fase + contratação |

Não granularizar os 14 tipos "porque sim" — priorizar por uso real
(`log_classificacao_obra`, `voz_comandos_log`). Ao aprofundar um tipo, seguir
exatamente o padrão do bloco "Construção de Muro" em
`03_seed_residencial_completo.sql`.

## Gaps conhecidos / próximos passos

- `agente-tipo-novo` é citado em `orquestrador.md` (fluxo de score < 0.5) mas ainda
  não existe como skill. Deve: propor rascunho de tipo/subtipo, exigir confirmação
  explícita do usuário, só então inserir em `tipos_obra_padrao`/`subtipos_obra`.
- `agente-materiais.md` precisa ser atualizado pra consultar
  `materiais_sugeridos_tenant` (join `tenant_id` + `etapa_padrao_id`) ao sugerir
  produto específico, com `INSERT ... ON CONFLICT (tenant_id, etapa_padrao_id,
  produto_id) DO UPDATE SET vezes_aceito = vezes_aceito + 1` quando o usuário aceita
  a sugestão repetidamente.
- Após aplicar `04`, rodar e resolver:
  ```sql
  SELECT id, nome, tipo_obra FROM public.obras WHERE migracao_tipo_pendente = true;
  ```
  Obras que não bateram com confiança ≥0.8 na migração automática de
  `tipo_obra` (texto legado) para `tipo_obra_padrao_id` ficam aqui, pendentes de
  revisão manual.
```

## Passo 4 — Atualizar o índice de documentação

Editar `docs/ai-context/24-ai-index.md`: adicionar a seção "Inteligência
Artificial" logo antes de "Config & referência", e atualizar a linha de
"Última atualização". Se o arquivo já tiver conteúdo diferente do que você
conhece, faça o merge preservando o que já existe — só adicione o necessário,
não sobrescreva seções não relacionadas a este pacote de IA.

Trecho a inserir:

```markdown
## Inteligência Artificial
- [`25-ia-classificacao-obras.md`](./25-ia-classificacao-obras.md) — classificação de tipo de obra, planejamento de fases/etapas, checklist e materiais sugeridos (agentes de IA)
```

## Passo 5 — Atualizar o CLAUDE.md da raiz do projeto

Adicionar ao `CLAUDE.md` existente (não sobrescrever o arquivo inteiro — só
inserir isto nos pontos indicados, preservando todo o resto do conteúdo atual):

a) Na seção "Antes de qualquer mudança", adicionar como item 4:

```markdown
4. Trabalhando no subsistema de IA (classificação de tipo de obra, planejamento de
   fases/etapas, checklist, materiais sugeridos)? Leia também
   `docs/ai-context/25-ia-classificacao-obras.md` antes de mexer em qualquer tabela
   `*_padrao` ou nas skills dos agentes (`orquestrador.md`, `agente-classificador.md`,
   `agente-planejador-fases.md`, `agente-checklist.md`, `agente-materiais.md`).
```

b) Nova seção, logo antes de "## Pendências de segurança conhecidas":

```markdown
## Subsistema de IA (classificação/planejamento de obras)

Camada `*_padrao` (tipos, sinônimos, subtipos, fases, etapas, checklist, materiais)
documentada em `docs/ai-context/25-ia-classificacao-obras.md`. Estado resumido:

- Migrations `01` a `05` (schema + seeds) instaladas em `supabase/migrations/`
  com prefixo `202607160900*`.
- `agente-tipo-novo` citado no `orquestrador.md` mas ainda não implementado.
- `agente-materiais.md` precisa atualização pra usar `materiais_sugeridos_tenant`
  em vez de referenciar `produtos` direto no template global.
- Após aplicar a migration `090300`: revisar `obras` com `migracao_tipo_pendente = true`
  (obras cujo `tipo_obra` legado não bateu com confiança >=0.8 na migração automática).
```

## Passo 6 — Aplicar as migrations

Use o fluxo de migration do Supabase já padronizado neste projeto (conforme
`docs/ai-context/16-coding-rules.md`) para aplicar os 5 arquivos criados no
Passo 2, em ordem. Depois de aplicar, rode:

```sql
-- Confirma que as tabelas principais foram criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%_padrao';

-- Confirma quantidade de tipos/fases carregados
SELECT count(*) FROM public.tipos_obra_padrao;   -- esperado: 15
SELECT count(*) FROM public.fases_padrao;          -- esperado: > 100

-- Obras que ficaram pendentes de revisão manual na migração de tipo_obra legado
SELECT id, nome, tipo_obra FROM public.obras WHERE migracao_tipo_pendente = true;
```

Me reporte o resultado das 4 queries acima antes de considerar a tarefa concluída.

## Passo 7 — Atualizar CHANGELOG.md

Adicionar uma entrada nova no topo do `CHANGELOG.md` (não apagar entradas
anteriores):

```markdown
## 2026-07-16 — Sistema de classificação de obras por IA
- Nova camada `*_padrao`: tipos, sinônimos, subtipos, fases, etapas, checklist,
  contratações sugeridas e materiais sugeridos (5 migrations aplicadas).
- Novas tabelas de integração: `fase_item_checklist`, `materiais_sugeridos_tenant`.
- `obras` ganhou `tipo_obra_padrao_id` e `migracao_tipo_pendente` (migração do
  campo legado `tipo_obra` texto solto).
- Pendente: `agente-tipo-novo` não implementado.
- Pendente: `agente-materiais.md` precisa usar `materiais_sugeridos_tenant`.
- Pendente: revisar obras com `migracao_tipo_pendente = true` (ver query no
  docs/ai-context/25-ia-classificacao-obras.md).
```

## Regras gerais para tudo isso (não negociável)

- Nunca aplique as migrations sem antes rodar a checagem do Passo 1.
- Nunca edite os arquivos SQL deste documento ao copiá-los — copie exatamente
  como estão, incluindo comentários.
- Se qualquer passo falhar (ex: tabela referenciada não existe neste projeto,
  como `produtos`, `categorias_produtos`, `obras`, `obra_fases`, `fase_itens`),
  PARE, não improvise um schema alternativo, e me reporte exatamente o erro.
- Ao final de tudo, faça um único commit com todos os arquivos criados/editados,
  usando o template de `.gitmessage` já configurado no projeto.
