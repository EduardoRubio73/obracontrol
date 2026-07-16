# 03 - Routing

Roteador: `react-router-dom` v6 em `src/App.tsx`.

## Guards
- `ProtectedRoute` — exige `useAuth().user`; redireciona para `/login`.
- `PublicRoute` — se autenticado, redireciona para `/`.
- `RequireObra` (component) — usado dentro de páginas que exigem obra ativa selecionada (não "all").

## Rotas

| Rota | Componente | Guard | Params | Notas |
|------|-----------|-------|--------|-------|
| `/login` | `Auth` | Public | — | Login/signup email+senha |
| `/cotacao/:token` | `PortalFornecedor` | **Público** | `token` | Portal do fornecedor via `token_publico` |
| `/` | `Index` | Protected | — | Landing autenticada |
| `/dashboard` | `Dashboard` | Protected | — | Visão geral com cards/widgets |
| `/obras` | `Obras` | Protected | — | Listagem CRUD de obras |
| `/hoje` | `Hoje` | Protected | — | Tarefas/alertas do dia |
| `/etapas` | `Etapas` | Protected | — | Fases da obra ativa |
| `/etapas/:id` | `EtapaDetalhe` | Protected | `id` (fase) | Itens da fase + fotos |
| `/compras` | `Compras` | Protected | — | CRUD de compras |
| `/financeiro` | `Financeiro` | Protected | — | Receitas/despesas |
| `/cotacoes` | `Cotacoes` | Protected | — | Cotações + envio a fornecedores |
| `/cotacoes/:id/comparar` | `Comparacao` | Protected | `id` | Comparativo de propostas |
| `/fornecedores` | `Fornecedores` | Protected | — | CRUD fornecedores |
| `/produtos` | `Produtos` | Protected | — | CRUD produtos (com categorias/unidades) |
| `/nova-obra` | `NovaObra` | Protected | — | Wizard de criação |
| `/galeria` | `Galeria` | Protected | — | Fotos da obra ativa |
| `/documentos` | `Documentos` | Protected | — | Documentos por obra |
| `/obras/:id/dossie` | `Dossie` | Protected | `id` | Dossiê consolidado |
| `/obras/:id/galeria` | `Galeria` | Protected | `id` | Alternativa por obra |
| `/obras/:id/materiais` | `Materiais` | Protected | `id` | — |
| `/obras/:id/documentos` | `Documentos` | Protected | `id` | — |
| `/obras/:id/alteracoes` | `ObraAlteracoes` | Protected | `id` | Histórico de alterações |
| `/relatorios` | `Relatorios` | Protected | — | Relatórios |
| `/configuracoes` | `Configuracoes` | Protected | — | Categorias, unidades, produtos, tipos, importação |
| `/auditoria` | `Auditoria` | Protected | — | Log `auditoria` |
| `/chat` | `Chat` | Protected | — | Assistente IA |
| `/perfil` | `Perfil` | Protected | — | Perfil do usuário |
| `*` | `NotFound` | — | — | 404 |

## Páginas presentes no filesystem mas não roteadas
- `Analise.tsx`, `Ranking.tsx` — presentes em `src/pages/` mas **não referenciadas em `App.tsx`**. Código morto / futuro. Ver `15-known-limitations.md`.

## Navegação
- Sidebar (`AppSidebar`) e `MobileBottomNav` centralizam a navegação.
- `ObraContextTabs` alterna sub-visões dentro do contexto de obra.
- `obraAtivaId` em `localStorage` persiste a obra selecionada; `"all"` = todas.
