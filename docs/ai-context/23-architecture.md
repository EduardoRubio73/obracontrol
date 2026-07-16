# 23 - Architecture Diagrams

## Alto nível
```mermaid
flowchart TB
  subgraph Client[Browser SPA]
    R[React 18 + Vite]
    RQ[TanStack Query]
    RR[React Router]
    RHF[react-hook-form + zod]
    UI[shadcn/ui + Tailwind]
  end

  subgraph Supabase
    Auth[(Auth)]
    PG[(Postgres + RLS)]
    ST[(Storage: obras, documentos)]
    EF[Edge Functions Deno]
  end

  subgraph AI[Lovable AI Gateway]
    LLM[Chat / Completions]
  end

  R -->|SDK JS| Auth
  R -->|SDK JS| PG
  R -->|SDK JS| ST
  R -->|invoke| EF
  EF -->|service_role| PG
  EF -->|storage| ST
  EF -->|fetch + LOVABLE_API_KEY| LLM
```

## Camadas do frontend
```mermaid
flowchart TB
  Pages[pages/*] --> Comp[components/domínio]
  Pages --> UI[components/ui]
  Comp --> UI
  Pages --> Hooks[hooks: useAuth, useObraAtiva]
  Pages --> SB[supabase client]
  Hooks --> SB
  Hooks --> RQ[React Query]
  Pages --> RQ
```

## Fluxo de importação (interno)
```mermaid
flowchart LR
  Upload[Upload no Dialog] --> Bucket[(Storage: documentos)]
  Bucket --> Parse[importar-documento]
  Parse --> Shared[_shared/importer.ts]
  Shared --> Match[fuzzy match fornecedor/produto]
  Match --> Preview[Preview JSON]
  Preview --> Review[UI Revisão]
  Review --> Commit[commitar-importacao]
  Commit --> Tables[(compras / cotacoes / propostas / financeiro)]
```

## Multi-tenancy (atual)
```mermaid
flowchart LR
  A[auth.uid()] --> RLS[RLS policies user_id = auth.uid()]
  RLS --> Rows[Linhas isoladas por usuário]
```
