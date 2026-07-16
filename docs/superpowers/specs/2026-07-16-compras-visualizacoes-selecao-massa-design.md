# Compras — visualizações (cards/lista/tabela) e seleção em massa

Data: 2026-07-16

## Contexto

A página de Compras (`src/pages/Compras.tsx`) hoje é um arquivo único de 537
linhas, sem componentes extraídos. A listagem de itens só existe em uma forma:
grid de cards (`grid-cols-1 md:grid-cols-2`), agrupados em duas seções fixas
(🕐 Pendentes / ✅ Comprados), renderizadas por uma função local `renderCard`.

Não existe em nenhuma página do projeto:
- Um toggle de visualização (grid/lista/tabela) — buscado e confirmado ausente.
- Um padrão de seleção em massa sobre **itens já existentes** com ação em lote
  (o que existe em `Cotacoes.tsx` e `EtapaDetalhe.tsx` é seleção para
  **adicionar** algo novo, não para agir sobre registros existentes).

Os componentes shadcn `src/components/ui/table.tsx` e
`src/components/ui/toggle-group.tsx` já estão instalados no projeto mas nunca
foram usados em nenhuma tela.

## Objetivo

1. Adicionar botões para alternar entre 3 visualizações da lista de compras:
   **Cards** (atual), **Lista** (compacta, 1 coluna) e **Tabela** (linhas de
   dados).
2. Adicionar seleção em massa (checkbox por item + "selecionar todos") e uma
   ação em lote "Marcar como comprado", disponível nas 3 visualizações.

Fora de escopo: exclusão em massa, mudança de status em lote para outros
status além de "comprado", persistência da visualização escolhida entre
sessões (fica como estado de componente, não localStorage).

## Decisões (confirmadas com o usuário)

- **Colunas da tabela**: Item, Fornecedor, Qtd/Preço, Total, Status, Ações.
- **Seleção disponível em**: as 3 visualizações (Cards, Lista, Tabela), estado
  compartilhado — trocar de visualização não perde a seleção.
- **Regra de seleção**: só itens com `status === "pendente"` são
  selecionáveis/marcáveis. Itens comprados/cancelados nunca aparecem com
  checkbox.
- **Visualizações**: 3 opções (Cards continua existindo como padrão, Lista e
  Tabela são novas) — nenhuma visualização é removida.

## Arquitetura / Componentização

`src/pages/Compras.tsx` (`ComprasContent`) continua dono de todo o estado
(queries, mutations, formulário de criar/editar) e passa a orquestrar também:

- `viewMode: "cards" | "lista" | "tabela"` (novo estado, default `"cards"`).
- `selectedIds: Set<string>` (novo estado, compartilhado entre visualizações).

Novos componentes em `src/components/compras/`:

| Componente | Responsabilidade |
|---|---|
| `CompraViewToggle.tsx` | 3 botões (ícones LayoutGrid/List/Table2 do lucide-react) usando `ToggleGroup` do shadcn. Controlado (`value`/`onValueChange`). |
| `CompraCard.tsx` | Card completo — extração do `renderCard` atual, com checkbox de seleção quando `status === "pendente"`. Props tipadas em vez de `any`. |
| `CompraListItem.tsx` | Linha compacta (1 coluna): nome+fornecedor à esquerda, total+status+ações à direita; checkbox quando selecionável. |
| `CompraTable.tsx` | `<Table>` do shadcn com header (checkbox "selecionar todos" + colunas) e linhas mapeadas; `overflow-x-auto` para mobile. |
| `BulkActionBar.tsx` | Aparece quando `selectedIds.size > 0`. Mostra "N selecionado(s)", botão "Marcar como comprado" (com spinner durante a mutação) e "Cancelar seleção". |

Tipo compartilhado (substituindo os usos de `any` no arquivo atual):

```ts
type Compra = Tables<"compras"> & {
  fornecedor_nome?: string;
  produto_nome?: string;
};
```

Cada visualização continua respeitando o agrupamento existente
(Pendentes / Comprados) — a seção decide como renderizar seus itens de
acordo com `viewMode`; o checkbox "selecionar todos" só existe no cabeçalho
da seção/tabela de Pendentes (a seção Comprados nunca é selecionável).

## Fluxo de dados — seleção e ação em massa

1. Usuário marca checkboxes individuais e/ou "selecionar todos" (Pendentes).
   `selectedIds` é atualizado no componente pai (`Compras.tsx`).
2. Ao trocar `viewMode`, `selectedIds` é preservado (os IDs são os mesmos,
   independente de como são exibidos).
3. `BulkActionBar` aparece com a contagem e o botão "Marcar como comprado".
4. Ao clicar, dispara `Promise.allSettled` com uma chamada
   `supabase.rpc("marcar_comprado", { p_compra_id })` por item selecionado
   (a RPC existente só aceita 1 ID por vez — não há endpoint de lote no
   banco, e criar um está fora de escopo).
5. Ao final:
   - Invalida `["compras", obraId]` e `["financeiro"]` uma única vez
     (mesmo padrão que a mutation `marcarComprado` individual já usa hoje).
   - Toast de sucesso com contagem dos que deram certo
     (ex.: "5 compras marcadas como compradas!").
   - Se houver falhas, toast de erro separado informando quantas falharam —
     nunca falha silenciosa.
   - `selectedIds` é limpo (sucesso total) ou mantém apenas os IDs que
     falharam (falha parcial), para o usuário poder tentar de novo.
6. Itens que saem da lista de pendentes (por qualquer motivo — marcado
   individualmente, exclusão, etc.) são removidos automaticamente de
   `selectedIds`.

## Tratamento de erros

- Falha de rede/RPC em qualquer item da ação em massa: reportada via toast,
  nunca engolida silenciosamente (consistente com a preferência do projeto).
- Botão de ação em massa fica desabilitado durante a mutação em andamento,
  para evitar duplo clique/duplo lançamento financeiro.

## Testes

Projeto não tem suíte de testes automatizados configurada para páginas
(Vitest existe no monorepo mas não há testes de UI para Compras hoje).
Verificação será manual via `webapp-testing` / dev server:
- Alternar entre as 3 visualizações e confirmar que os dados batem.
- Selecionar itens individualmente e via "selecionar todos"; confirmar que
  a seleção persiste ao trocar de visualização.
- Executar "Marcar como comprado" em massa com 2+ itens e confirmar
  toast, atualização das seções (item sai de Pendentes) e lançamento no
  financeiro (mesma tabela/fluxo que a ação individual já dispara).
- Confirmar que itens comprados/cancelados nunca mostram checkbox.
