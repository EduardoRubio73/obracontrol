-- ============================================================================
-- Remove o "Catálogo Mestre" (tipos_obra/ambientes/serviços/etapas/tarefas/
-- insumos/templates compartilhados, admin-only) inteiro.
--
-- Motivo: verificação em produção (18/07/2026) mostrou que:
-- 1. É uma reimplementação paralela de etapas_padrao/tarefas_padrao (que já
--    existem, são por usuário, e têm dados reais: 30 etapas / 25 tarefas em
--    7 obras) — mesmo conceito (etapa contém tarefas), amarrado a um
--    "Serviço" extra e escopado como catálogo compartilhado/admin.
-- 2. A migration de seed (20260718132000) tenta inserir a coluna
--    "tempo_dias" em catalogo_etapa_tarefas, que não existe nessa tabela —
--    o INSERT falha e tudo daí em diante nunca rodou. Resultado real no
--    banco: catalogo_servico_etapas, catalogo_etapa_tarefas,
--    catalogo_servico_insumos_padrao, catalogo_templates e as 3 tabelas de
--    junção catalogo_template_* estão todas com 0 linhas. Só os catálogos
--    "flat" (tipos_obra=4, ambientes=8, servicos=10) foram de fato semeados.
-- 3. A Edge Function gerar-template-ia recebe do Gemini a estrutura
--    completa (serviços→etapas→tarefas) mas só salva nome/descrição do
--    template — descarta o resto. Mesmo corrigido, hoje não existe UI para
--    ligar serviços/etapas/tarefas/ambientes a um template manualmente.
-- 4. Nada disso é lido em produção: obra_servicos e obra_servico_insumos
--    também estão vazias (a expansão de template nunca rodou de verdade).
--
-- Ver CHANGELOG.md (18/07/2026) para o relato completo.
-- ============================================================================

DROP TABLE IF EXISTS public.obra_servico_insumos CASCADE;
DROP TABLE IF EXISTS public.obra_servicos CASCADE;

DROP TABLE IF EXISTS public.catalogo_template_servicos CASCADE;
DROP TABLE IF EXISTS public.catalogo_template_ambientes CASCADE;
DROP TABLE IF EXISTS public.catalogo_template_tipos_obra CASCADE;
DROP TABLE IF EXISTS public.catalogo_templates CASCADE;

DROP TABLE IF EXISTS public.catalogo_servico_insumos_padrao CASCADE;
DROP TABLE IF EXISTS public.catalogo_etapa_tarefas CASCADE;
DROP TABLE IF EXISTS public.catalogo_servico_etapas CASCADE;
DROP TABLE IF EXISTS public.catalogo_servicos CASCADE;
DROP TABLE IF EXISTS public.catalogo_ambientes CASCADE;
DROP TABLE IF EXISTS public.catalogo_tipos_obra CASCADE;

-- Colunas de rastreabilidade adicionadas em tabelas que continuam existindo
-- (as FKs eram ON DELETE SET NULL, então o DROP TABLE acima não as removeu).
ALTER TABLE public.obra_fases DROP COLUMN IF EXISTS obra_servico_id;
ALTER TABLE public.obra_fases DROP COLUMN IF EXISTS catalogo_etapa_id;
ALTER TABLE public.fase_itens DROP COLUMN IF EXISTS catalogo_tarefa_id;

DROP FUNCTION IF EXISTS public.fn_normalize_catalogo_servico() CASCADE;
DROP FUNCTION IF EXISTS public.fn_is_admin();

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;
