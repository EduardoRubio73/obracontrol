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
