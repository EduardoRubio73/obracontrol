

# Plano: Navegação Global — Menu Burger, Breadcrumbs, Abas de Contexto

## Resumo
Resolver o problema de "beco sem saída" adicionando menu burger no mobile, breadcrumbs contextuais em todas as páginas, logo clicável para dashboard, e barra de abas horizontal para navegar entre seções da obra ativa.

## 1. Menu Burger no Mobile (AppLayout)

- Remover `<div className="hidden md:block">` que esconde o sidebar no mobile
- Adicionar `SidebarTrigger` (ícone hamburger) visível apenas no mobile (`md:hidden`) no header, antes do logo
- O sidebar já usa `collapsible="icon"` — mudar para `collapsible="offcanvas"` para funcionar como drawer no mobile
- Manter sidebar visível normalmente no desktop

## 2. Logo Inteligente

- Clique no logo (mobile e desktop) navega para `/dashboard` em vez de `/`
- Manter botão "Voltar" visível no mobile ao lado do burger

## 3. Breadcrumbs Universais

- Expandir breadcrumbs para aparecer em TODAS as páginas (não só obra pages)
- Para páginas sem obra: `Dashboard > Página Atual`
- Para páginas com obra: `🏗️ Obras > [Nome da Obra] > [Seção]`
- Para sub-rotas como `/etapas/:id` ou `/obras/:id/dossie`: incluir nível intermediário
- Breadcrumbs ficam na segunda linha do header, sempre visíveis

## 4. Abas Horizontais de Contexto da Obra

- Criar componente `ObraContextTabs` com abas scrolláveis horizontalmente
- Abas: 📅 Etapas, 💰 Financeiro, 🛒 Compras, 📋 Cotações, 🖼️ Galeria, 📁 Documentos
- Renderizar abaixo do header (dentro de `AppLayout`) quando `showObraSelector` é true e há obra selecionada
- Usar `overflow-x-auto` + `flex-nowrap` para scroll horizontal no mobile
- Aba ativa destacada com cor primária baseada na rota atual

## 5. Header Sticky (já implementado)

- O header já tem `sticky top-0 z-40` — garantir que as abas de contexto também fiquem dentro do sticky header

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/AppLayout.tsx` | Burger trigger, breadcrumbs universais, logo → dashboard, abas de contexto |
| `src/components/AppSidebar.tsx` | Ajuste `collapsible` para offcanvas no mobile |
| `src/components/ObraContextTabs.tsx` | **Novo** — barra de abas scrolláveis para seções da obra |

## Detalhes Técnicos

- `SidebarTrigger` do shadcn já renderiza ícone hamburger e controla open/close do sidebar
- Abas usarão `NavLink` do react-router para highlight automático da rota ativa
- Breadcrumbs expandidos com lógica condicional: se `obraAtiva` existe mostra caminho da obra, senão mostra caminho genérico
- `MobileBottomNav` pode ser mantido como complemento ou removido (redundante com burger + abas)

