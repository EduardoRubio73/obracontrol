# 11 - State Management

## TanStack Query (React Query v5) — fonte primária
- `QueryClient` global em `App.tsx`.
- Todas as queries usam `queryKey` estável com dependências (ex.: `["compras", filtroObraId]`).
- Mutações invalidam queries relevantes com `queryClient.invalidateQueries({ queryKey: [...] })`.
- Não há configuração global de `staleTime` — padrão zero.

## Contexts (React) — estado global mínimo
| Context | Provider | Escopo |
|---------|----------|--------|
| `AuthContext` | `AuthProvider` em `App.tsx` (root) | Sessão / user |
| `ObraAtivaContext` | `ObraAtivaProvider` dentro de `ProtectedRoute` | Obra selecionada + lista |

## Local storage
- `obra_ativa_id` — id da obra ativa (ou `"all"`).
- Supabase auth token (gerenciado pelo SDK).

## Formulários
- `react-hook-form` + resolver `zod`.
- Não há Zustand/Redux/Jotai — evitar introduzir sem necessidade.

## Toasts / notificações
- **Sonner** (`sonner` package + `<Sonner />` em App.tsx) — preferido.
- shadcn `<Toaster />` legado ainda presente.
