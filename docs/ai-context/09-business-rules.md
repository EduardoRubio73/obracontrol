# 09 - Business Rules

## Obras
- Status: `planejamento` → `execução` (automático via trigger na primeira fase iniciada) → `concluida` / `cancelada`.
- `valor_previsto` é a base de orçamento. Alertas de orçamento disparam a >90% de gasto.
- `classificacao ∈ {simples, media, complexa}` determina sugestão de fornecedores (`fn_sugerir_fornecedores`).
- **Escopo IA completo (wizard)**: `gerar-escopo` retorna materiais, mão de obra, etapas com durações e alertas (prazo/clima/orçamento). A IA nunca retorna datas — o cliente (`useCriarObra`) calcula o cronograma sequencial a partir de `data_inicio` e grava `obra_fases`/`fase_itens` (`executar_em` = início da fase). `data_prevista_conclusao` = informada pelo usuário, ou soma das durações. Orçamento fica só no total (`valor_previsto`), sem distribuição por etapa.
- **Cotações separadas na criação**: materiais → fornecedores `tipo != 'profissional'` (itens `tipo='produto'`); mão de obra → `tipo='profissional'` (itens `tipo='mao_de_obra'` com `escopo`). Uma cotação por grupo com ≥1 selecionado.

## Fases (`obra_fases` + `fase_itens`)
- Progresso da fase = `count(itens.status='concluido') / count(itens) * 100` (recalculado por trigger).
- Status derivado: 0% → `pendente`, parcial → `em_andamento`, 100% → `concluido`.
- Fase atrasada: `data_fim < CURRENT_DATE` e `status ≠ concluido/cancelado` → alerta `atraso`.
- Fase parada: `em_andamento` e `progresso=0` e `data_inicio ≤ hoje-7` → alerta `parada`.
- Fase em risco: mais de 50% do prazo decorrido com progresso <30% → alerta `risco`.

## Cotações
- Estados: `rascunho` → `enviada` (com `token_publico`) → propostas recebidas → decisão.
- Portal público (`/cotacao/:token`) usa RPCs `SECURITY DEFINER`.
- `cotacao_fornecedores.status`: `pendente → enviado → visualizado → respondeu` (ou `expirado`).
- **Regra legada `validar_3_propostas`**: exige mínimo 3 propostas antes de finalizar (trigger existe; verificar se está atualmente ativado).
- Expiração automática via `expirar_cotacoes()` (cron externo/manual).

## Fornecedores
- Score = `0.4 * taxa_resposta + 0.4 * taxa_vitoria + 0.2 * rapidez` (`atualizar_ranking_fornecedor`).
- Status derivado (`avaliar_fornecedor`):
  - `score < 0.3` → `bloqueado`
  - `faltas ≥ 3` (não respondeu) → `alerta`
  - senão → `ativo`
- Fornecedor `bloqueado` **não pode** ser incluído em `cotacao_fornecedores`.

## Compras
- `marcar_comprado(compra_id)` muda status para `comprado` e cria lançamento em `financeiro` (despesa).

## Financeiro
- Alerta `orcamento` quando `soma(despesas) / valor_previsto > 0.9`.

## Importação de documento
- `importar-documento` gera preview com scores de match: ≥90 auto-vinculado, 60-90 revisar, <60 criar novo.
- `commitar-importacao` **exige** `obra_id` — usuário escolhe na tela de revisão.
- Formatos: CSV, XLSX, DOCX, PDF-texto, MD, TXT. Sem OCR.

## Obra ativa
- `obraAtivaId === "all"` bloqueia queries que exigem UUID e mostra card de seleção.
- Persiste em `localStorage`.
