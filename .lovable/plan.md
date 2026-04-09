

# Plano: Correção de Localização — Cards no Index, Limpeza do Dashboard, Scroll Invisível

## 1. Remover shortcut cards do Dashboard.tsx

Remover as linhas ~241-281 (definição de `shortcutCards` e o bloco JSX que renderiza o grid de 6 cards). Dashboard volta a ser apenas gráficos e resumos financeiros. Remover também a variável `comprasCount` que só servia para os cards.

## 2. Mover cards coloridos para Index.tsx

Substituir o menu gradient atual por 6 cards grandes e coloridos quando uma obra está selecionada:
- 📋 Etapas (fundo azul claro), 🛒 Compras (fundo laranja claro), 💰 Financeiro (fundo verde claro)
- 📝 Cotações (fundo amarelo/laranja claro), 🖼️ Galeria (fundo rosa claro), 📁 Documentos (fundo âmbar claro)

Cada card mostra resumo rápido (queries já existentes no Index.tsx podem ser reaproveitadas). Layout: `grid grid-cols-2 sm:grid-cols-3 gap-4`, sem larguras fixas.

Quando "Todas as Obras" estiver selecionado, mostrar card de boas-vindas + atalhos gerais (manter menuItems existentes como fallback).

## 3. ObraContextTabs — scroll invisível com botões grandes

Alterar de `flex-wrap` para `overflow-x-auto` com scrollbar escondida:
- Adicionar CSS `::-webkit-scrollbar { display: none }` e `-ms-overflow-style: none; scrollbar-width: none`
- Manter `min-h-[44px]` nos botões
- Usar `flex-nowrap` para permitir arrastar horizontalmente sem barra visível

## 4. Sidebar — confirmar auto-close no mobile

O `setOpenMobile(false)` já está no `AppSidebar.tsx` (linha 43). Verificar que está sendo chamado no `onClick` de cada link dentro de `renderItems`.

## 5. Header — confirmar limpeza

O header já está limpo (apenas burger + logo + seletor de obra) conforme `AppLayout.tsx` atual. Breadcrumbs já foram removidos. Nenhuma mudança necessária.

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Remover shortcutCards e grid |
| `src/pages/Index.tsx` | Adicionar 6 cards coloridos com resumos |
| `src/components/ObraContextTabs.tsx` | Scroll invisível, flex-nowrap, 44px |
| `src/index.css` | Adicionar classe `.scrollbar-hide` |

