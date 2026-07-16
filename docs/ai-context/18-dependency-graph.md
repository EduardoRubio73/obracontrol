# 18 - Dependency Graph

```mermaid
graph LR
  main[main.tsx] --> App[App.tsx]
  App --> QP[QueryClientProvider]
  App --> AP[AuthProvider]
  App --> Router[BrowserRouter]
  Router --> Auth[/login → Auth/]
  Router --> Portal[/cotacao/:token → PortalFornecedor/]
  Router --> Protected{ProtectedRoute}
  Protected --> OAP[ObraAtivaProvider]
  OAP --> Layout[AppLayout]
  Layout --> Sidebar[AppSidebar]
  Layout --> MBN[MobileBottomNav]
  Layout --> Outlet[Outlet: Pages]

  subgraph Pages
    Dashboard --> Widgets[dashboard/*]
    Compras --> SB[(Supabase)]
    Cotacoes --> SB
    Cotacoes --> RPC1[fn_criar_cotacao_com_fornecedores]
    NovaObra --> RPC2[fn_criar_obra_inteligente]
    Configuracoes --> IPD[ImportarProdutosDialog]
    IPD --> EF1[importar-documento]
    IPD --> EF2[commitar-importacao]
    Chat --> EF3[chat-assistente]
  end

  Widgets --> SB
  AP --> SBC[supabase client]
  OAP --> SBC
  EF1 --> Shared[_shared/importer.ts]
  EF2 --> Shared
```

## Dependências principais entre módulos
- **`useAuth`** → consumido por: `App.tsx` (guards), toda página que precisa de `user.id`.
- **`useObraAtiva`** → consumido por: todos os widgets do Dashboard, `AppSidebar`, `RequireObra`, `Etapas`, `Compras`, `Financeiro`, `Cotacoes`, `Galeria`, `Documentos`, `Materiais`.
- **`supabase` client** → consumido por: hooks acima + todas as páginas + Edge Functions.
- **`_shared/importer.ts`** → consumido por: `importar-documento` e `commitar-importacao`.
- **`regras-decisao.ts`** → consumido por: `apoio-decisao` edge function.

## Regra: quem depende de quem
- **NADA** deve depender de `src/pages/*` (páginas são folhas).
- **NADA** deve depender de Edge Functions no frontend, exceto via `supabase.functions.invoke`.
- `src/components/ui/*` não pode depender de `src/hooks` (evita ciclos).
