

# Plano: Dashboard Avançado + Perfil Admin

## Visao Geral

Evoluir o Dashboard existente para incluir: filtro global por obra, novos cards (documentos, alterações, fornecedores, cotações detalhadas, evolução mensal), seção admin com auditoria/logs, e botão de geração de dossiê. Mobile mantém visão resumida.

## O que ja existe

- `Dashboard.tsx`: cards resumo, obras recentes, financeiro, cotações, timeline de fases, gráfico previsto vs gasto, tabela de obras (desktop only)
- `Auditoria.tsx`: página separada com filtro por tabela
- `Dossie.tsx`: página de dossiê por obra com timeline de eventos
- Tabelas DB: `financeiro` (com `data_transacao`), `documentos`, `obra_alteracoes`, `fornecedores`, `cotacoes`, `propostas`, `auditoria`, `voz_comandos_log`

## O que muda

### 1. Filtro Global por Obra (Dashboard.tsx)

- Adicionar `useState<string | null>` para `obraFiltro` no topo
- Select com todas as obras + opção "Todas as obras"
- Quando selecionada, todas as queries filtram por `obra_id`
- Queries afetadas: financeiro, fases, cotações, alertas + novas queries

### 2. Novos Cards Desktop

**Evolução Mensal (LineChart)**: Query financeiro agrupado por mês (`data_transacao`), filtrado por obra selecionada. Usa `recharts` LineChart.

**Comparativo**: Card com previsto vs real vs saldo da obra selecionada (já existe parcialmente, refinar para obra individual).

**Documentos**: Query `documentos` filtrada por obra. Lista com nome, tipo, data, botão visualizar.

**Alterações (Auditoria de Obra)**: Query `obra_alteracoes` filtrada por obra. Exibe tipo, descrição, impacto financeiro.

**Fornecedores**: Query `cotacao_fornecedores` + `fornecedores` para obra selecionada. Exibe nome, score, status.

**Cotações Detalhadas**: Query `cotacoes` + `propostas` para obra. Exibe status, propostas recebidas, fornecedor vencedor.

### 3. Seção Admin (Desktop only)

- Verificar admin via `is_admin_global()` — chamar como RPC ou checar no frontend se o user tem permissão (simplificado: mostrar para todos autenticados, dados já filtrados por RLS)
- Card Auditoria: últimos 20 logs da tabela `auditoria`
- Card Logs Voz: últimos registros de `voz_comandos_log`
- Visão multi-obras: tabela comparativa já existe, manter

### 4. Botão "Gerar Dossiê"

- Quando obra selecionada, mostrar botão "Gerar Dossiê da Obra"
- Navega para `/obras/{id}/dossie` (página já existente)

### 5. Mobile

- Manter apenas: resumo cards, obras recentes, progresso, ações rápidas
- Esconder: gráficos, auditoria, documentos, tabelas (usar `hidden md:block`)

## Detalhes Tecnicos

- **Sem migration necessária** — todas as tabelas já existem
- **Dashboard.tsx**: reescrever com estado de filtro, ~8 queries condicionais, layout responsivo com `hidden md:block` para seções pesadas
- **Recharts**: adicionar `LineChart, Line` import (já pinned v2.12.7)
- **Queries condicionais**: quando `obraFiltro` muda, queries usam `.eq("obra_id", obraFiltro)` se não for "todas"

## Ordem

1. Adicionar filtro global por obra no header
2. Refatorar queries existentes para respeitar filtro
3. Adicionar novos cards desktop (evolução mensal, documentos, alterações, fornecedores, cotações)
4. Adicionar seção admin (auditoria + logs)
5. Adicionar botão "Gerar Dossiê"
6. Garantir mobile mostra apenas resumo

