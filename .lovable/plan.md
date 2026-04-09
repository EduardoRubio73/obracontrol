

# Plano: Refatoração Completa do Fluxo de Cotações

## Resumo
Refatorar o fluxo de cotações em 3 blocos: criação com redirecionamento para itens, gestão com abas (Itens + Fornecedores), e correção do Portal do Fornecedor com geração de PDF.

## Bloco 1: Criação e Listagem

### 1.1 — Nova Cotação → Redirecionar para Edição de Itens
- Ao criar cotação, gerar `token_publico` (UUID) automaticamente no insert
- Após sucesso do `createCotacao`, em vez de fechar o modal, abrir o `itemDialog` com o ID da cotação recém-criada (ou navegar para uma rota dedicada)
- Remover `datalist` do campo Descrição, usar `autocomplete="off"` no Input

### 1.2 — Contador visual no card da listagem
- Adicionar query para contar itens por cotação (fetch all `itens_cotacao` para as cotações visíveis)
- No card, exibir `📦 X itens` ou `⚠️ Sem itens` (em vermelho) se zero

### 1.3 — Botões Editar/Excluir na listagem
- Adicionar botão ✏️ (editar nome + data expiração via Dialog)
- Adicionar botão 🗑️ (excluir com confirmação)
- Mutations: `update cotacoes` e `delete cotacoes`

## Bloco 2: Abas Itens + Fornecedores

### 2.1 — Reorganizar o Dialog de gerenciamento
- Substituir o dialog atual de itens por um com duas abas (`Tabs` do Radix):
  - **Aba 1 — Itens do Orçamento**: Manter o catálogo de produtos + adição manual + lista atual com delete individual
  - **Aba 2 — Fornecedores Selecionados**: Lista de fornecedores do banco com checkboxes, e botão "📧 Enviar para todos selecionados" que dispara o `enviarCotacao` + mailto

### 2.2 — Consolidar envio
- Mover a lógica do `sendDialog` para dentro da Aba 2, eliminando o dialog separado de envio

## Bloco 3: Portal do Fornecedor + PDF

### 3.1 — Token Público
- Garantir que o `token_publico` é gerado no momento da criação (já no insert do Bloco 1)
- Verificar a rota `/cotacao/:token` no App.tsx (já existe como `PortalFornecedor`)

### 3.2 — Portal do Fornecedor
- O componente `PortalFornecedor.tsx` já existe e funciona. Verificar se RLS permite leitura anon via `token_publico` (as policies já cobrem isso com `c.token_publico IS NOT NULL`)
- Garantir tabela limpa: Item | Quantidade | Preço Unitário

### 3.3 — Botão Gerar PDF (Espelho do Orçamento)
- Na visão do admin (dialog de detalhes ou listagem), adicionar botão "🖨️ Gerar Espelho"
- Usar `window.print()` com CSS `@media print` ou gerar PDF client-side com a lista de itens (sem preços), cabeçalho com logo ObraControl

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Cotacoes.tsx` | Refatoração principal: criação com token, redirect para itens, cards com contadores, edit/delete, abas Itens+Fornecedores, botão PDF |
| `src/pages/PortalFornecedor.tsx` | Ajustes menores se necessário na tabela de itens |
| `src/App.tsx` | Nenhuma mudança esperada (rota já existe) |

## Detalhes Técnicos

- Token gerado via `crypto.randomUUID()` no client antes do insert
- Contagem de itens: query adicional `itens_cotacao` agrupada por `cotacao_id` ou fetch em batch
- PDF: usar `window.print()` com componente de impressão estilizado (abordagem mais simples, sem dependências extras)
- Abas: usar componente `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` já existente em `src/components/ui/tabs.tsx`

