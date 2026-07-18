# 08 - Database

Projeto Supabase: `xsqnkptdbabnvjcrvaob`. **Sempre consultar `src/integrations/supabase/types.ts` para o contrato exato.** Este documento resume o schema; use `supabase--read_query` para colunas atualizadas.

## Tabelas (schema `public`)

| Tabela | Descrição resumida | Policies |
|--------|-------------------|----------|
| `obras` | Cadastro de obras. FKs conceituais para `user_id`. Colunas: nome, tipo_obra, classificacao, status, valor_previsto, main_image, tenant_id (legado), user_id | 4 |
| `obra_fases` | Fases da obra. nome, ordem, status (pendente/em_andamento/concluido/cancelado), progresso, data_inicio, data_fim, obra_id | 1 |
| `fase_itens` | Itens dentro de fase. status (pendente/concluido). Dispara triggers de progresso e alerta de atraso | 1 |
| `fase_fotos` | Fotos por fase — path no bucket `obras` | 1 |
| `etapas_padrao` / `tarefas_padrao` | Templates de fases/tarefas | 4 / 1 |
| `compras` | Compras. status (pendente/comprado). FK `produto_id` → `produtos` | 4 |
| `financeiro` | Lançamentos receita/despesa. FK `obra_id` | 4 |
| `cotacoes` | Cotação com `token_publico` para portal | 4 |
| `cotacao_fornecedores` | Relação NxN cotação↔fornecedor + status (pendente/enviado/visualizado/respondeu/expirado) | 4 |
| `itens_cotacao` | Itens solicitados na cotação | 4 |
| `propostas` | Proposta de um fornecedor | 4 |
| `proposta_itens` | Itens/valores da proposta | 2 |
| `fornecedores` | Cadastro. status (ativo/alerta/bloqueado), score, categoria | 4 |
| `fornecedor_metricas` | Métricas agregadas (convites/respostas/vitórias/tempo/score) | 1 |
| `tipos_fornecedor` / `tipos_obra` | Tabelas de apoio | 1 / 1 |
| `produtos` | Catálogo de produtos | 1 |
| `categorias_produtos` | Categorias | 1 |
| `unidades_medida` | Unidades (un, kg, m2, …) | 1 |
| `documentos` | Documentos anexados à obra (path no bucket `documentos`) | 3 |
| `obra_dossie` | Dossiê consolidado | 1 |
| `obra_alteracoes` | Histórico de alterações da obra | 1 |
| `obra_status_historico` | Transições de status | 1 |
| `alertas_sistema` | Alertas gerados por triggers | 1 |
| `auditoria` | Log de auditoria (tabela, ação, dados) | 1 |
| `profiles` | Perfil do usuário (id = auth.uid()) | 5 |
| `voz_comandos_log` | Log de comandos de voz | — |
| `importacoes_log` | Log de importações (hash SHA-256 do arquivo) — bloqueia reimportar o mesmo arquivo por usuário | 1 |
| `tenants` | Legado multi-tenant | — |
| `fornecedores_cotacao` | Legado/duplicado — provavelmente **código morto** | — |
| `Atualização_Automatica_n8n` | Integração externa (nome com acento — evitar) | — |

## Views (relatórios)
SQL views prontas para agregações — preferir a elas em vez de re-somar client-side.
Confirmadas em `types.ts` (bloco `Views`), não presentes nas tabelas acima:

| View | Colunas | Escopo por obra |
|------|---------|------------------|
| `vw_resumo_financeiro` | `id, nome, valor_previsto, total_gasto, saldo` | `id` **é** o id da obra — filtrar `.eq("id", obraId)` |
| `vw_progresso_obra` | `obra_id, progresso_geral` | `.eq("obra_id", obraId)` |
| `vw_fases_previsao` | `id, obra_id, nome, status, progresso, progresso_esperado, atrasado, dias_decorridos, dias_planejados` | `.eq("obra_id", obraId)` |
| `vw_fase_eficiencia` | `id, nome, previsto, real, eficiencia_percentual` | **sem `obra_id`** — `id` é o id da fase; filtrar via `.in("id", faseIds)` obtidos de `obra_fases.eq("obra_id", obraId)`. Nunca usar `tenant_id` |
| `vw_alertas_inteligentes` | `obra_id, obra, fase_id, fase, progresso, status_ia` | `.eq("obra_id", obraId)` |
| `vw_proximos_prazos` | `id, obra, tipo, data, dias_restantes` | **sem `obra_id` nenhum** — não dá pra escopar com segurança por obra sem match por nome |
| `vw_propostas_comparativo` | `cotacao_id, fornecedor, ranking, valor` | escopo por cotação, não por obra |
| `vw_sugestao_compra` | `id, item, fase, obra_id, valor_previsto, valor_real, diferenca, acao` | `.eq("obra_id", obraId)` — **nunca consumida por nenhuma tela** até 18/07/2026, validar semântica antes de usar |

## Storage buckets
- **`obras`** (público) — fotos e imagens principais.
- **`documentos`** (público) — anexos, documentos de importação, comprovantes.

## Triggers principais
- `auto_status_obra_execucao` — muda obra `planejamento → execução` na primeira execução.
- `fn_atualizar_progresso_fase` / `fn_status_fase` — recalcula progresso/status ao mudar `fase_itens`.
- `fn_alerta_atraso` — cria `alertas_sistema` quando fase atrasa.
- `trigger_ranking` / `trigger_avaliacao` — atualiza métricas e status do fornecedor após proposta.
- `impedir_fornecedor_bloqueado` — bloqueia inserção em `cotacao_fornecedores` para fornecedor com status `bloqueado`.
- `log_auditoria` / `audit_trigger` — grava em `auditoria`. Anexado via `trg_audit_*`
  em praticamente **todas** as tabelas do schema (confirmado 16/07/2026 via
  `information_schema.triggers`), não só `profiles`. Ele exige `auth.uid()` não-nulo
  para preencher `auditoria.user_id` (NOT NULL) — qualquer migration que faça
  INSERT/UPDATE/DELETE direto numa tabela auditada (sem JWT, `auth.uid()` NULL)
  quebra com `null value in column "user_id"`. Workaround já usado 2x:
  `ALTER TABLE <t> DISABLE TRIGGER USER; <escrita>; ALTER TABLE <t> ENABLE TRIGGER
  USER;` ao redor da escrita de sistema (ver `20260716200000_fix_missing_profiles.sql`
  e `20260716222404_dedupe_categorias_produtos.sql`). Considerar corrigir na raiz
  (`COALESCE(auth.uid(), ...)` ou pular log quando NULL) em vez de repetir o wrapper.
- `set_tenant_id` / `set_tenant_from_obra` — legado tenant.

## RLS
Modelo atual: **`user_id = auth.uid()`** nas tabelas principais. Funções `SECURITY DEFINER` (`get_public_cotacao_by_token`, `submit_public_proposta`, …) fornecem acesso público controlado via token.

## Grants
Padrão em migrations: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<t> TO authenticated;` + `GRANT ALL … TO service_role`. `anon` só quando necessário (portal fornecedor via RPC).
