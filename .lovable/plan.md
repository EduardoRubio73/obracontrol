

# Plano: Contexto Global de Obra Ativa

## Problema
Telas como Etapas, Financeiro, Compras e Cotações não têm contexto de obra. Etapas usa "primeira obra" hardcoded, Financeiro lista tudo sem filtro, Compras usa uma view sem filtro. Risco de lançar dados na obra errada.

## Solução

### 1. Criar Context React: `ObraAtivaProvider`

Novo arquivo `src/hooks/useObraAtiva.tsx`:
- React Context com `obraAtivaId` e `setObraAtivaId`
- Persiste seleção em `localStorage`
- Query para buscar lista de obras (`id, nome`) do usuário
- Expõe `obras`, `obraAtiva` (objeto com id+nome), `obraAtivaId`, `setObraAtivaId`

### 2. Integrar Provider no App

Em `App.tsx`, wrappear as rotas protegidas com `<ObraAtivaProvider>` (dentro de `AuthProvider` e `QueryClientProvider`).

### 3. Seletor de Obra no Header (AppLayout)

Em `AppLayout.tsx`:
- Adicionar `Select` no header (ao lado do botão Voltar)
- Mostra nome da obra ativa
- Dropdown com todas as obras do usuário
- Visível em mobile e desktop

### 4. Breadcrumb contextual

Abaixo do header ou dentro dele, exibir:
`Obras > Nome da Obra > [Tela Atual]`
Usando os componentes Breadcrumb já existentes em `src/components/ui/breadcrumb.tsx`.

### 5. Bloqueio sem obra selecionada

Criar componente `RequireObra` que verifica se há obra ativa. Se não:
- Exibe mensagem "Selecione uma obra para continuar"
- Bloqueia o conteúdo da página

### 6. Atualizar telas para usar contexto

**Etapas** (`src/pages/Etapas.tsx`):
- Remover query "primeira-obra"
- Usar `obraAtivaId` do context
- Mutations usam `obraAtivaId` automaticamente

**Financeiro** (`src/pages/Financeiro.tsx`):
- Filtrar transações por `obra_id = obraAtivaId`
- Remover seletor de obra do formulário de criação (usar automaticamente)

**Cotações** (`src/pages/Cotacoes.tsx`):
- Filtrar por `obra_id = obraAtivaId`
- Criar cotação com `obra_id` automático

**Compras** (`src/pages/Compras.tsx`):
- Filtrar view por obra (se possível) ou filtrar client-side

**Fornecedores**: Mantém sem filtro (exceção documentada).

**Dashboard**: Sincronizar o filtro de obra do dashboard com o contexto global.

### 7. Sidebar + Mobile Nav

Adicionar indicador visual da obra ativa na sidebar (desktop) e no bottom nav (mobile).

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/hooks/useObraAtiva.tsx` | Criar (context + provider) |
| `src/App.tsx` | Adicionar provider |
| `src/components/AppLayout.tsx` | Seletor de obra + breadcrumb no header |
| `src/pages/Etapas.tsx` | Usar context, remover query primeira-obra |
| `src/pages/Financeiro.tsx` | Filtrar por obraAtivaId |
| `src/pages/Cotacoes.tsx` | Filtrar por obraAtivaId |
| `src/pages/Compras.tsx` | Filtrar por obraAtivaId |
| `src/pages/Dashboard.tsx` | Sincronizar com context |

## Sem migrations
Todas as tabelas já têm `obra_id`. Apenas filtros no frontend.

