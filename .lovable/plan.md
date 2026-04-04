

# Tela de Ranking de Fornecedores

## O que será feito

Criar uma nova página `/ranking` que exibe o ranking dos fornecedores baseado em métricas automáticas (taxa de resposta, vitórias e rapidez), com badges coloridos por faixa de score e RLS adequado.

## Plano

### 1. Migração SQL -- RLS para `fornecedor_metricas`
A tabela `fornecedor_metricas` existe mas não tem RLS policies. Criar policy para que o owner veja as métricas dos seus fornecedores (join com `fornecedores.user_id`).

### 2. Nova página `src/pages/Ranking.tsx`
- Query: join `fornecedor_metricas` com `fornecedores` para obter nome, email, e métricas
- Tabela ordenada por score desc com colunas: Fornecedor, Convites, Respostas, Vitórias, Tempo Médio (h), Score
- Badge colorido por faixa:
  - `> 0.8` → verde "Excelente"
  - `> 0.5` → azul "Bom"  
  - `> 0.3` → laranja "Regular"
  - `≤ 0.3` → vermelho "Ruim"
- Progress bar visual para o score
- Estado vazio quando não há métricas

### 3. Registrar rota e navegação
- Adicionar `/ranking` em `App.tsx` (rota protegida dentro do AppLayout)
- Adicionar item "Ranking" no `AppSidebar.tsx` e `MobileBottomNav.tsx` com ícone `Trophy`

### Arquivos modificados
- 1 migração SQL (RLS `fornecedor_metricas`)
- `src/pages/Ranking.tsx` (novo)
- `src/App.tsx` (nova rota)
- `src/components/AppSidebar.tsx` (nav item)
- `src/components/MobileBottomNav.tsx` (nav item)

