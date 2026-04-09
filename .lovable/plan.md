

# Plano: UX e Interatividade — Sidebar, Header, Abas e Cards de Atalho

## 1. Sidebar fecha ao clicar em link (mobile)

**AppSidebar.tsx**: Importar `useSidebar` e chamar `setOpenMobile(false)` ao clicar em qualquer link. Modificar `renderItems` para adicionar `onClick={() => { if (isMobile) setOpenMobile(false) }}` em cada `NavLink`.

Sidebar ja tem `useSidebar` importado — basta adicionar `isMobile` e `setOpenMobile` do contexto.

## 2. Header Ultra-Clean

**AppLayout.tsx**: Remover toda a seção de Breadcrumbs (linhas 110-147). Remover imports de Breadcrumb. Header fica apenas com: burger (esquerda), logo, e seletor de obra (direita). Remover tambem o botao "Voltar".

## 3. Barra de Gestao (ObraContextTabs) — flex-wrap, botoes maiores

**ObraContextTabs.tsx**:
- Remover `overflow-x-auto` e `min-w-max`
- Usar `flex flex-wrap gap-2 px-4 py-2`
- Botoes com `min-h-[44px] px-4 py-2 text-sm` para toque facil
- Remover `whitespace-nowrap` — permitir wrap natural

## 4. Cards de Atalho na pagina da Obra (Dashboard)

**Dashboard.tsx**: Quando `filtroId` existe (obra selecionada), exibir grid de 6 cards grandes e coloridos ANTES dos summary cards:

```
grid grid-cols-2 sm:grid-cols-3 gap-3
```

Cards: Etapas, Compras, Financeiro, Cotacoes, Galeria, Documentos. Cada card com emoji, titulo, resumo (ex: "X etapas em andamento"), e `onClick` para navegar. Cores distintas com `bg-blue-50`, `bg-green-50`, etc.

Dados de resumo ja disponiveis: `fases`, `cotacoes`, `financeiro`, `documentos`.

## 5. Mobile-First: sem larguras fixas

Revisar `SelectTrigger` no header — trocar `w-[160px]` por `w-full max-w-[180px]`.

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/AppSidebar.tsx` | Fechar sidebar ao clicar link no mobile |
| `src/components/AppLayout.tsx` | Remover breadcrumbs, limpar header |
| `src/components/ObraContextTabs.tsx` | flex-wrap, botoes 44px, sem scroll |
| `src/pages/Dashboard.tsx` | Cards de atalho coloridos quando obra selecionada |

