-- ============================================================================
-- Testes de Integração: Catálogo Mestre
-- Validação de RLS, expansão de templates, e cálculos
-- ============================================================================

-- Este arquivo documenta os testes E2E do catálogo. Para rodar:
-- 1. Conectar ao Supabase como admin via psql ou Dashboard
-- 2. Executar cada seção comentada manualmente
-- 3. Verificar resultados

-- ── TEST 1: RLS - Admin pode criar catalogo_tipos_obra ──
-- 1. Fazer login como admin (user com is_admin = true)
-- 2. Executar:
--   INSERT INTO catalogo_tipos_obra (nome, descricao, ativo)
--   VALUES ('Teste Admin', 'Tipo de obra de teste', true);
-- 3. Esperar: SUCCESS (INSERT realizado)

-- ── TEST 2: RLS - Non-admin recebe erro ao criar ──
-- 1. Fazer login como non-admin user (is_admin = false)
-- 2. Executar mesmo INSERT acima
-- 3. Esperar: ERROR (permission denied - RLS policy blocks)

-- ── TEST 3: Todos conseguem ler catalogo_tipos_obra ──
-- 1. Fazer login como non-admin
-- 2. Executar:
--   SELECT * FROM catalogo_tipos_obra;
-- 3. Esperar: Retorna dados (SELECT allowed for authenticated)

-- ── TEST 4: Expansão de Template - Básico ──
-- 1. Ter um template com 1 serviço, 1 etapa, 1 tarefa, 1 insumo
-- 2. Criar obra como user normal
-- 3. Chamar Edge Function:
--   const { data } = await supabase.functions.invoke("expandir-template", {
--     body: { obra_id: "uuid-da-obra", template_id: "uuid-do-template" }
--   });
-- 4. Verificar resposta:
--   {
--     "success": true,
--     "obraServicos": 1,
--     "obraFases": 1,
--     "faseItens": 1,
--     "message": "..."
--   }
-- 5. Verificar em BD:
SELECT COUNT(*) as obra_servicos_count FROM obra_servicos WHERE obra_id = 'test-obra-id';
SELECT COUNT(*) as obra_fases_count FROM obra_fases WHERE obra_id = 'test-obra-id';
SELECT COUNT(*) as fase_itens_count FROM fase_itens
  WHERE fase_id IN (SELECT id FROM obra_fases WHERE obra_id = 'test-obra-id');
SELECT COUNT(*) as insumos_count FROM obra_servico_insumos
  WHERE obra_servico_id IN (SELECT id FROM obra_servicos WHERE obra_id = 'test-obra-id');

-- ── TEST 5: Quantidade_final é calculado corretamente ──
-- Verificar que quantidade_final = quantidade_sugerida * (1 + perda_percentual/100)
-- Exemplo: quantidade_sugerida=100, perda_percentual=10 → quantidade_final=110
SELECT
  nome_insumo,
  quantidade_sugerida,
  perda_percentual,
  quantidade_final,
  (quantidade_sugerida * (1 + perda_percentual::numeric / 100.0)) as expected_final,
  CASE
    WHEN quantidade_final = (quantidade_sugerida * (1 + perda_percentual::numeric / 100.0))
    THEN 'OK'
    ELSE 'ERRO'
  END as status
FROM obra_servico_insumos
WHERE obra_servico_id IN (SELECT id FROM obra_servicos WHERE obra_id = 'test-obra-id');

-- ── TEST 6: Relacionamentos - Cascata de deletions ──
-- 1. Deleta catalogo_servicos(id) que está em template
-- 2. Verifica que catalogo_template_servicos NÃO foi deletado (ON DELETE SET NULL não aplica aqui)
-- Na verdade, a constraint é ON DELETE CASCADE, então:
--   DELETE FROM catalogo_servicos WHERE id = 'test-servico-id';
-- 3. Verifica que catalogo_template_servicos COM aquele servico agora tem servico_id = NULL
SELECT * FROM catalogo_template_servicos WHERE servico_id IS NULL;

-- ── TEST 7: Expansão com múltiplos serviços ──
-- 1. Template com 3 serviços, cada um com 2 etapas, cada etapa com 2 tarefas
-- 2. Expansão deve criar:
--    - 3 obra_servicos
--    - 6 obra_fases
--    - 12 fase_itens
-- 3. Verificar contagens
SELECT
  (SELECT COUNT(*) FROM obra_servicos WHERE obra_id = 'test-obra-id') as servicos,
  (SELECT COUNT(*) FROM obra_fases WHERE obra_id = 'test-obra-id') as fases,
  (SELECT COUNT(*) FROM fase_itens WHERE fase_id IN
    (SELECT id FROM obra_fases WHERE obra_id = 'test-obra-id')) as tarefas;

-- ── TEST 8: Edge case - Template vazio ──
-- 1. Criar template sem nenhum catalogo_template_servicos
-- 2. Chamar expandir-template
-- 3. Esperar:
--    - SUCCESS (não deve error)
--    - obraServicos = 0
--    - obraFases = 0
--    - faseItens = 0

-- ── TEST 9: Edge case - Serviço sem etapas ──
-- 1. Template com serviço que NÃO tem catalogo_servico_etapas
-- 2. Expansão deve criar obra_servicos mas nenhum obra_fases
-- 3. Verificar que obra_servicos existe mas fase_itens = 0 para esse serviço

-- ── TEST 10: Insumos com produto matching ──
-- 1. Expansão cria obra_servico_insumos com produto_id = NULL (neste estágio)
-- 2. Frontend/admin pode depois atualizar produto_id via UI
-- 3. Verificar que inserts sucessem mesmo com produto_id NULL:
SELECT * FROM obra_servico_insumos
WHERE obra_servico_id IN (SELECT id FROM obra_servicos WHERE obra_id = 'test-obra-id')
AND produto_id IS NULL;

-- ── TEST 11: RLS - obra_servicos (user ownership) ──
-- 1. User A cria obra X
-- 2. User B tenta SELECT obra_servicos de User A's obra
-- 3. Esperar: ERROR (RLS policy allows only own obras)
-- Policy check: EXISTS (SELECT 1 FROM obras o WHERE o.id = obra_servicos.obra_id AND o.user_id = auth.uid())

-- ── TEST 12: Dossie entries foram criados ──
-- Após criar obra com template, verificar que dossie entries existem:
SELECT tipo, titulo FROM obra_dossie
WHERE obra_id = 'test-obra-id'
ORDER BY created_at;
-- Esperar:
-- - "obra_criada" entry
-- - "template_expandido" entry (se template foi usado)
-- - "solicitacao_enviada" entry (se fornecedores foram adicionados)

-- ============================================================================
-- Checklist de Validação Manual
-- ============================================================================
-- [ ] Admin consegue criar catalogo_tipos_obra em Configuracoes
-- [ ] Non-admin vê erro ao tentar criar
-- [ ] Catalog items aparecem em NovaObra template selector
-- [ ] Criar obra SEM template funciona (backward-compat)
-- [ ] Criar obra COM template expande automaticamente
-- [ ] obra_servicos, obra_fases, fase_itens criados corretamente
-- [ ] quantidade_final calculado com perda_percentual
-- [ ] User B não consegue ler obra_servicos de User A
-- [ ] Dossie entries criados para tracking
-- [ ] Edge case: Template vazio não causa erro
-- [ ] Edge case: Serviço sem etapas funciona

-- ============================================================================
-- Performance - Índices Verificados
-- ============================================================================
-- Índices já criados nas migrations:
-- - idx_catalogo_template_servicos_servico (catalogo_servicos lookups)
-- - idx_catalogo_template_tipos_obra_tipo (catalogo_tipos_obra lookups)
-- - idx_obra_servicos_obra (filtrar por obra_id)
-- - idx_obra_servico_insumos_servico (filtrar por obra_servico_id)

-- Queries importantes de performance:
-- 1. Fetch template com todas as relacionadas (expansão):
--    EXPLAIN ANALYZE
--    SELECT * FROM catalogo_templates
--    JOIN catalogo_template_servicos USING(id)
--    JOIN catalogo_servicos USING(id)
--    JOIN catalogo_servico_etapas USING(id)
--    ...
--    Deve usar índices, não full table scan

-- 2. Listar obras de um user:
--    EXPLAIN ANALYZE SELECT * FROM obras WHERE user_id = $1
--    Deve usar índice (se existir)

-- ============================================================================
-- Conclusão: Phase 4 Validação
-- ============================================================================
-- Se todos os testes acima passarem, o sistema está pronto para produção.
-- Erros esperados e como debugar:
--
-- ERROR: permission denied for schema public
--   → User não tem permissão. Verificar is_admin = true
--
-- ERROR: new row violates check constraint
--   → Valor inválido em coluna com constraint (ex: ativo NOT NULL)
--
-- ERROR: violates foreign key constraint
--   → Relacionamento quebrado (ex: template_id não existe)
--
-- Função retorna {error: "Not found"}
--   → obra_id ou template_id inválido/não existe
--
-- quantidade_final está NULL ou zerado
--   → Generated column problema. Verificar migração.
